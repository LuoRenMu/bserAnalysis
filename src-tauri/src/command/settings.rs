use crate::settings::{AppSettings, SettingsManager};
use tauri::AppHandle;

#[tauri::command]
pub async fn get_settings(
    app: AppHandle,
    manager: tauri::State<'_, SettingsManager>,
) -> Result<AppSettings, String> {
    manager.load(&app)
}

#[tauri::command]
pub async fn update_settings(
    app: AppHandle,
    manager: tauri::State<'_, SettingsManager>,
    settings: AppSettings,
) -> Result<(), String> {
    manager.save(&app, settings)
}

#[tauri::command]
pub async fn get_setting_language(
    manager: tauri::State<'_, SettingsManager>,
) -> Result<String, String> {
    Ok(manager.get_language())
}

#[tauri::command]
pub async fn set_setting_language(
    manager: tauri::State<'_, SettingsManager>,
    language: String,
) -> Result<(), String> {
    manager.set_language(&language);

    // 同时更新 cache 的语言
    crate::request::cache::CACHE.update_language(&language);

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_settings_manager_language_operations() {
        let manager = SettingsManager::new();

        manager.set_language("en");
        assert_eq!(manager.get_language(), "en");

        manager.set_language("ja");
        assert_eq!(manager.get_language(), "ja");
    }
}
