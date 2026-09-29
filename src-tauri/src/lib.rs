mod assets;
mod export;
mod persistence;
mod schema;
mod schema_v2;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(persistence::Workspace::default())
        .invoke_handler(tauri::generate_handler![
            persistence::create_project,
            persistence::open_project,
            persistence::save_project,
            persistence::refresh_assets,
            assets::import_asset,
            export::export_png
        ])
        .run(tauri::generate_context!())
        .expect("could not run Parcel Party Studio");
}
