use crate::schema::{validate, validate_relative};
use base64::{engine::general_purpose::STANDARD, Engine};
use serde::Serialize;
use serde_json::Value;
use std::{
    fs,
    path::{Path, PathBuf},
    sync::Mutex,
};
use tauri::State;

#[derive(Default)]
pub struct Workspace(pub Mutex<Option<PathBuf>>);

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LoadedProject {
    project: Value,
    directory: String,
    asset_data: std::collections::HashMap<String, String>,
}

pub(crate) fn error(e: impl std::fmt::Display) -> String {
    e.to_string()
}

fn asset_path(root: &Path, relative: &str) -> Result<PathBuf, String> {
    validate_relative(relative)?;
    let resolved = root.join(relative).canonicalize().map_err(error)?;
    let assets = root.join("assets").canonicalize().map_err(error)?;
    if !assets.starts_with(root.canonicalize().map_err(error)?) || !resolved.starts_with(&assets) {
        return Err("Asset escapes the project directory".into());
    }
    Ok(resolved)
}

pub fn save_to(root: &Path, project: &Value) -> Result<(), String> {
    validate(project)?;
    for file in ["project.json", "project.json.bak"] {
        if fs::symlink_metadata(root.join(file)).is_ok_and(|m| m.file_type().is_symlink()) {
            return Err("Project and backup files cannot be symbolic links".into());
        }
    }
    for asset in project["assets"].as_array().unwrap() {
        asset_path(root, asset["path"].as_str().unwrap())?;
    }
    fs::create_dir_all(root.join("assets")).map_err(error)?;
    let dest = root.join("project.json");
    let temp = root.join(format!(".project-{}.tmp", uuid::Uuid::new_v4()));
    let bytes = serde_json::to_vec_pretty(project).map_err(error)?;
    let result = (|| {
        use std::io::Write;
        let mut file = fs::OpenOptions::new()
            .create_new(true)
            .write(true)
            .open(&temp)
            .map_err(error)?;
        file.write_all(&bytes).map_err(error)?;
        file.sync_all().map_err(error)?;
        drop(file);
        if dest.exists() {
            fs::copy(&dest, root.join("project.json.bak")).map_err(error)?;
        }
        fs::rename(&temp, &dest).map_err(error)
    })();
    if result.is_err() {
        let _ = fs::remove_file(temp);
    }
    result
}

fn load_from(root: &Path) -> Result<LoadedProject, String> {
    let file = root.join("project.json");
    if fs::metadata(&file).map_err(error)?.len() > 16 * 1024 * 1024 {
        return Err("Project file exceeds 16 MB".into());
    }
    let project: Value = serde_json::from_slice(&fs::read(file).map_err(error)?).map_err(error)?;
    validate(&project)?;
    let mut asset_data = std::collections::HashMap::new();
    let mut total = 0;
    for asset in project["assets"].as_array().unwrap() {
        let path = asset_path(root, asset["path"].as_str().unwrap())?;
        let size = fs::metadata(&path).map_err(error)?.len();
        total += size;
        if size > 20 * 1024 * 1024 || total > 100 * 1024 * 1024 {
            return Err("Assets exceed memory limit (20 MB each / 100 MB total)".into());
        }
        let data = fs::read(path).map_err(error)?;
        asset_data.insert(
            asset["id"].as_str().unwrap().to_owned(),
            format!(
                "data:{};base64,{}",
                asset["mime"].as_str().unwrap(),
                STANDARD.encode(data)
            ),
        );
    }
    Ok(LoadedProject {
        project,
        directory: root.to_string_lossy().into_owned(),
        asset_data,
    })
}

pub(crate) fn root(state: &State<'_, Workspace>) -> Result<PathBuf, String> {
    state
        .0
        .lock()
        .map_err(error)?
        .clone()
        .ok_or("Create or open a local project first".into())
}

#[tauri::command]
pub async fn create_project(
    project: Value,
    state: State<'_, Workspace>,
) -> Result<Option<LoadedProject>, String> {
    validate(&project)?;
    let Some(folder) = rfd::AsyncFileDialog::new()
        .set_title("Choose an empty folder for your project")
        .pick_folder()
        .await
    else {
        return Ok(None);
    };
    let path = folder.path().to_path_buf();
    if path.join("project.json").exists() || path.join("assets").exists() {
        return Err(
            "This folder already contains a project or assets. Choose a new folder.".into(),
        );
    }
    save_to(&path, &project)?;
    let loaded = load_from(&path)?;
    *state.0.lock().map_err(error)? = Some(path);
    Ok(Some(loaded))
}

#[tauri::command]
pub async fn open_project(state: State<'_, Workspace>) -> Result<Option<LoadedProject>, String> {
    let Some(file) = rfd::AsyncFileDialog::new()
        .set_title("Open project.json")
        .add_filter("Parcel Party project", &["json"])
        .pick_file()
        .await
    else {
        return Ok(None);
    };
    if file.path().file_name().and_then(|n| n.to_str()) != Some("project.json") {
        return Err("Select the project's project.json file".into());
    }
    let path = file
        .path()
        .parent()
        .ok_or("Invalid project directory")?
        .to_path_buf();
    let loaded = load_from(&path)?;
    *state.0.lock().map_err(error)? = Some(path);
    Ok(Some(loaded))
}

#[tauri::command]
pub async fn save_project(project: Value, state: State<'_, Workspace>) -> Result<(), String> {
    save_to(&root(&state)?, &project)
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;
    fn fixture() -> Value {
        json!({ "version": 1, "id": "stable-id", "name": "Test", "template": { "kind": "circle", "width": 600, "height": 600, "safeInset": 24, "outlineWidth": 3, "fill": "#c99b62", "outline": "#805a38" }, "elements": [], "assets": [] })
    }
    #[test]
    fn roundtrip_and_backup() {
        let dir = tempfile::tempdir().unwrap();
        let mut p = fixture();
        save_to(dir.path(), &p).unwrap();
        p["name"] = json!("Changed");
        save_to(dir.path(), &p).unwrap();
        assert_eq!(load_from(dir.path()).unwrap().project, p);
        assert!(dir.path().join("assets").is_dir());
        let backup: Value =
            serde_json::from_slice(&fs::read(dir.path().join("project.json.bak")).unwrap())
                .unwrap();
        assert_eq!(backup["name"], "Test");
    }
    #[test]
    fn rejects_traversal_and_absolute_paths() {
        for path in [
            "../secret",
            "assets/../../secret",
            "C:/secret.png",
            "/tmp/secret",
            "assets\\secret.png",
            "assets/nested/file.png",
        ] {
            assert!(validate_relative(path).is_err(), "{path}");
        }
        assert!(validate_relative("assets/stable-id.png").is_ok());
    }
    #[test]
    fn rejects_bad_versions_and_dimensions_without_overwriting() {
        let dir = tempfile::tempdir().unwrap();
        let mut p = fixture();
        save_to(dir.path(), &p).unwrap();
        p["version"] = json!(2);
        assert!(save_to(dir.path(), &p).is_err());
        p["version"] = json!(1);
        p["template"]["width"] = json!(-1);
        assert!(save_to(dir.path(), &p).is_err());
        assert_eq!(load_from(dir.path()).unwrap().project, fixture());
    }
    #[test]
    fn assets_survive_roundtrip() {
        let dir = tempfile::tempdir().unwrap();
        fs::create_dir(dir.path().join("assets")).unwrap();
        fs::write(dir.path().join("assets/image.png"), b"placeholder").unwrap();
        let mut p = fixture();
        p["assets"] = json!([{ "id": "img", "name": "test", "path": "assets/image.png", "mime": "image/png" }]);
        save_to(dir.path(), &p).unwrap();
        let loaded = load_from(dir.path()).unwrap();
        assert_eq!(loaded.project["assets"][0]["path"], "assets/image.png");
        assert!(loaded.asset_data["img"].starts_with("data:image/png;base64,"));
    }
    #[test]
    fn preserves_layer_order_transforms_and_flags() {
        let dir = tempfile::tempdir().unwrap();
        let mut p = fixture();
        let first = json!({ "id": "layer-a", "kind": "rectangle", "name": "Tape", "x": -30, "y": 22, "width": 88, "height": 126, "rotation": 33, "opacity": 0.4, "visible": false, "locked": true, "fill": "#eac080" });
        let mut second = first.clone();
        second["id"] = json!("layer-b");
        second["visible"] = json!(true);
        p["elements"] = json!([first, second]);
        save_to(dir.path(), &p).unwrap();
        assert_eq!(load_from(dir.path()).unwrap().project, p);
        p["elements"][1]["id"] = json!("layer-a");
        assert!(save_to(dir.path(), &p).is_err());
    }
    #[test]
    fn rejects_bad_ratios_missing_assets_and_corrupt_json() {
        let dir = tempfile::tempdir().unwrap();
        let mut p = fixture();
        p["template"]["width"] = json!(300);
        assert!(save_to(dir.path(), &p).is_err());
        p = fixture();
        p["assets"] = json!([{ "id": "missing", "name": "Missing", "path": "assets/missing.png", "mime": "image/png" }]);
        assert!(save_to(dir.path(), &p).is_err());
        fs::write(dir.path().join("project.json"), "{broken").unwrap();
        assert!(load_from(dir.path()).is_err());
    }
}
