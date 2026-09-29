use crate::persistence::error;
use base64::{engine::general_purpose::STANDARD, Engine};
use std::fs;

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
