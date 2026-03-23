mod storage;

use storage::{Campaign, CampaignIndex};
use tauri::{AppHandle, Emitter, Manager};

#[tauri::command]
fn get_data_root_path(app: AppHandle) -> Result<String, String> {
    storage::get_data_root_path(&app)
}

#[tauri::command]
fn list_campaigns(app: AppHandle) -> Result<CampaignIndex, String> {
    storage::list_campaigns(&app)
}

#[tauri::command]
fn load_campaign(app: AppHandle, id: String) -> Result<Campaign, String> {
    storage::load_campaign(&app, id)
}

#[tauri::command]
fn save_campaign(app: AppHandle, campaign: Campaign) -> Result<(), String> {
    storage::save_campaign(&app, campaign)
}

#[tauri::command]
fn create_campaign(app: AppHandle, name: String) -> Result<Campaign, String> {
    storage::create_campaign(&app, name)
}

#[tauri::command]
fn delete_campaign(app: AppHandle, id: String) -> Result<(), String> {
    storage::delete_campaign(&app, id)
}

#[tauri::command]
fn set_active_campaign(app: AppHandle, id: Option<String>) -> Result<(), String> {
    storage::set_active_campaign(&app, id)
}

/// Called by the frontend after a final save so the window can close after `CloseRequested` was prevented.
#[tauri::command]
fn complete_app_close(app: AppHandle) -> Result<(), String> {
    let w = app
        .get_webview_window("main")
        .ok_or_else(|| "main window missing".to_string())?;
    w.destroy().map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.app_handle().emit("save-before-close", ());
            }
        })
        .invoke_handler(tauri::generate_handler![
            get_data_root_path,
            list_campaigns,
            load_campaign,
            save_campaign,
            create_campaign,
            delete_campaign,
            set_active_campaign,
            complete_app_close,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
