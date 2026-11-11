// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/

mod agent;

use serde::Serialize;
use tauri::Manager;

/// Display name shown in the UI and window title.
pub const PRODUCT_NAME: &str = "Agely";

/// Build metadata the frontend can show (e.g. in an About panel) to confirm
/// which native build is running.
#[derive(Debug, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct AppInfo {
    pub name: &'static str,
    pub version: &'static str,
}

fn app_info_value() -> AppInfo {
    AppInfo {
        name: PRODUCT_NAME,
        version: env!("CARGO_PKG_VERSION"),
    }
}

#[tauri::command]
fn app_info() -> AppInfo {
    app_info_value()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(agent::AgentState::new())
        .setup(|app| {
            // Version comes from Cargo (bumped in lockstep with package.json and
            // tauri.conf.json) so the window title shows the running build.
            if let Some(window) = app.get_webview_window("main") {
                window.set_title(&format!("{PRODUCT_NAME} v{}", env!("CARGO_PKG_VERSION")))?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            app_info,
            agent::agent_status,
            agent::agent_turn
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn app_info_reports_product_name_and_cargo_version() {
        let info = app_info_value();
        assert_eq!(info.name, "Agely");
        assert_eq!(info.version, env!("CARGO_PKG_VERSION"));
    }

    #[test]
    fn app_info_serialises_in_camel_case() {
        let json = serde_json::to_value(app_info_value()).unwrap();
        assert!(json.get("name").is_some());
        assert!(json.get("version").is_some());
    }
}
