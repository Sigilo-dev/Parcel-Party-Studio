use crate::persistence::{error, root, Workspace};
use base64::{engine::general_purpose::STANDARD, Engine};
use serde_json::{json, Value};
use std::fs;
use tauri::State;

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
    let valid = match mime {
        "image/png" => bytes.starts_with(b"\x89PNG\r\n\x1a\n"),
        "image/jpeg" => bytes.starts_with(&[0xff, 0xd8, 0xff]),
        "image/webp" => bytes.starts_with(b"RIFF") && bytes.get(8..12) == Some(b"WEBP"),
        _ => false,
    };
    if !valid {
        return Err("Image content does not match its file extension".into());
    }
    let id = uuid::Uuid::new_v4().to_string();
    let relative = format!("assets/{id}.{ext}");
    fs::create_dir_all(root.join("assets")).map_err(error)?;
    let assets = root.join("assets").canonicalize().map_err(error)?;
    if !assets.starts_with(root.canonicalize().map_err(error)?) {
        return Err("Assets directory escapes project".into());
    }
    let total = fs::read_dir(&assets)
        .map_err(error)?
        .try_fold(0_u64, |sum, entry| {
            let size = entry.map_err(error)?.metadata().map_err(error)?.len();
            Ok::<u64, String>(sum + size)
        })?;
    if total + bytes.len() as u64 > 100 * 1024 * 1024 {
        return Err("Project assets exceed 100 MB. Use smaller images.".into());
    }
    fs::write(root.join(&relative), &bytes).map_err(error)?;
    Ok(Some(
        json!({ "asset": { "id": id, "name": file.file_name(), "path": relative, "mime": mime }, "data": format!("data:{mime};base64,{}", STANDARD.encode(bytes)) }),
    ))
}
