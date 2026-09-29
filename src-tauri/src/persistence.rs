use base64::{engine::general_purpose::STANDARD, Engine};
use serde::Serialize;
use serde_json::{json, Value};
use std::{
    collections::HashSet,
    fs,
    path::{Component, Path, PathBuf},
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

fn error(e: impl std::fmt::Display) -> String {
    e.to_string()
}

pub fn validate(project: &Value) -> Result<(), String> {
    if project["version"].as_u64() != Some(1) {
        return Err("Unsupported project version".into());
    }
    for key in ["id", "name"] {
        if project[key]
            .as_str()
            .filter(|s| !s.is_empty() && s.len() <= 512)
            .is_none()
        {
            return Err(format!("Invalid {key}"));
        }
    }
    let template = &project["template"];
    let kind = template["kind"].as_str().unwrap_or("");
    if !["rectangular", "square", "circle", "bold"].contains(&kind) {
        return Err("Invalid template".into());
    }
    for key in ["width", "height"] {
        number(template, key, 64.0, 4096.0)?;
    }
    number(
        template,
        "safeInset",
        0.0,
        template["width"]
            .as_f64()
            .unwrap()
            .min(template["height"].as_f64().unwrap())
            / 2.0,
    )?;
    number(template, "outlineWidth", 0.0, 32.0)?;
    color(template, "fill")?;
    color(template, "outline")?;
    let assets = project["assets"].as_array().ok_or("Invalid assets")?;
    let elements = project["elements"].as_array().ok_or("Invalid elements")?;
    if elements.len() > 5000 || assets.len() > 500 {
        return Err("Project exceeds element or asset limits".into());
    }
    let mut ids = HashSet::new();
    let mut asset_ids = HashSet::new();
    for asset in assets {
        let id = asset["id"]
            .as_str()
            .filter(|s| !s.is_empty())
            .ok_or("Invalid asset id")?;
        if !asset_ids.insert(id) {
            return Err("Duplicate asset id".into());
        }
        let path = asset["path"].as_str().ok_or("Invalid asset path")?;
        validate_relative(path)?;
        if !["image/png", "image/jpeg", "image/webp"]
            .contains(&asset["mime"].as_str().unwrap_or(""))
        {
            return Err("Unsupported image format".into());
        }
    }
    for el in elements {
        let id = el["id"]
            .as_str()
            .filter(|s| !s.is_empty())
            .ok_or("Invalid element id")?;
        if !ids.insert(id) {
            return Err("Duplicate element id".into());
        }
        let kind = el["kind"].as_str().unwrap_or("");
        if !["rectangle", "ellipse", "text", "image"].contains(&kind) {
            return Err("Invalid element kind".into());
        }
        for key in ["x", "y"] {
            number(el, key, -32768.0, 32768.0)?;
        }
        for key in ["width", "height"] {
            number(el, key, 1.0, 16384.0)?;
        }
        number(el, "rotation", -36000.0, 36000.0)?;
        number(el, "opacity", 0.0, 1.0)?;
        color(el, "fill")?;
        for key in ["visible", "locked"] {
            if !el[key].is_boolean() {
                return Err(format!("Invalid {key}"));
            }
        }
        if el["name"].as_str().is_none() {
            return Err("Invalid element name".into());
        }
        if kind == "text" {
            number(el, "fontSize", 1.0, 1024.0)?;
            if el["text"].as_str().filter(|s| s.len() <= 10000).is_none() {
                return Err("Invalid text".into());
            }
        }
        if kind == "image" && !asset_ids.contains(el["assetId"].as_str().unwrap_or("")) {
            return Err("Missing image asset reference".into());
        }
    }
    Ok(())
}

fn number(value: &Value, key: &str, min: f64, max: f64) -> Result<(), String> {
    if value[key]
        .as_f64()
        .filter(|n| n.is_finite() && *n >= min && *n <= max)
        .is_none()
    {
        return Err(format!("Invalid {key}: expected {min} to {max}"));
    }
    Ok(())
}

fn color(value: &Value, key: &str) -> Result<(), String> {
    let s = value[key].as_str().unwrap_or("");
    if s.len() != 7 || !s.starts_with('#') || !s[1..].bytes().all(|c| c.is_ascii_hexdigit()) {
        return Err(format!("Invalid {key} color"));
    }
    Ok(())
}

pub fn validate_relative(path: &str) -> Result<(), String> {
    let parts: Vec<_> = Path::new(path).components().collect();
    if path.contains('\\')
        || path.contains(':')
        || parts.len() != 2
        || parts[0] != Component::Normal("assets".as_ref())
        || !matches!(parts[1], Component::Normal(_))
    {
        return Err("Asset paths must be relative files inside assets/".into());
    }
    Ok(())
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

fn root(state: &State<'_, Workspace>) -> Result<PathBuf, String> {
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

#[tauri::command]
pub async fn import_asset(state: State<'_, Workspace>) -> Result<Option<Value>, String> {
    let root = root(&state)?;
    let Some(file) = rfd::AsyncFileDialog::new()
        .set_title("Import a local image")
        .add_filter("Images", &["png", "jpg", "jpeg", "webp"])
        .pick_file()
        .await
    else {
        return Ok(None);
    };
    let ext = file
        .path()
        .extension()
        .and_then(|s| s.to_str())
        .unwrap_or("")
        .to_lowercase();
    let mime = match ext.as_str() {
        "png" => "image/png",
        "jpg" | "jpeg" => "image/jpeg",
        "webp" => "image/webp",
        _ => return Err("Unsupported image format".into()),
    };
    if fs::metadata(file.path()).map_err(error)?.len() > 20 * 1024 * 1024 {
        return Err("Images must be smaller than 20 MB".into());
    }
    let bytes = fs::read(file.path()).map_err(error)?;
    let id = uuid::Uuid::new_v4().to_string();
    let relative = format!("assets/{id}.{ext}");
    let assets = root.join("assets").canonicalize().map_err(error)?;
    if !assets.starts_with(root.canonicalize().map_err(error)?) {
        return Err("Assets directory escapes project".into());
    }
    fs::write(root.join(&relative), &bytes).map_err(error)?;
    Ok(Some(
        json!({ "asset": { "id": id, "name": file.file_name(), "path": relative, "mime": mime }, "data": format!("data:{mime};base64,{}", STANDARD.encode(bytes)) }),
    ))
}

#[tauri::command]
pub async fn export_png(data: String) -> Result<Option<String>, String> {
    let encoded = data
        .strip_prefix("data:image/png;base64,")
        .ok_or("Expected PNG data")?;
    if encoded.len() > 100 * 1024 * 1024 {
        return Err("Export exceeds 100 MB".into());
    }
    let bytes = STANDARD.decode(encoded).map_err(error)?;
    if !bytes.starts_with(b"\x89PNG\r\n\x1a\n") {
        return Err("Invalid PNG signature".into());
    }
    let Some(file) = rfd::AsyncFileDialog::new()
        .set_title("Export for Godot")
        .set_file_name("parcel.png")
        .add_filter("PNG image", &["png"])
        .save_file()
        .await
    else {
        return Ok(None);
    };
    fs::write(file.path(), bytes).map_err(error)?;
    Ok(Some(file.path().to_string_lossy().into_owned()))
}

#[cfg(test)]
mod tests {
    use super::*;
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
}
