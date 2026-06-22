use crate::core::ipc::GameSnapshot;
use crate::game_data::{DllGameDataSource, GameDataManager};

#[tauri::command]
pub fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
pub fn inject(state: tauri::State<GameDataManager>) -> Result<bool, String> {
    state.source()
        .inject()
        .map(|_| true)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn quit(state: tauri::State<GameDataManager>) -> Result<bool, String> {
    state.source()
        .quit()
        .map(|_| true)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn fetch(state: tauri::State<GameDataManager>) -> Result<GameSnapshot, String> {
    state.source()
        .fetch_snapshot()
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn reload_plugin(state: tauri::State<GameDataManager>) -> Result<(), String> {
    if let Some(dll_source) = state.source().as_any().downcast_ref::<DllGameDataSource>() {
        dll_source.reload();
        log::info!("Plugin cache cleared");
    } else {
        log::warn!("reload_plugin: source is not DllGameDataSource");
    }
    Ok(())
}

#[tauri::command]
pub fn set_plugin_path(
    state: tauri::State<GameDataManager>,
    path: String,
) -> Result<(), String> {
    let trimmed = path.trim();
    if trimmed.is_empty() {
        return Err("DLL 路径不能为空".to_string());
    }

    let path_buf = std::path::PathBuf::from(trimmed);
    if !path_buf.exists() {
        return Err(format!("DLL 路径错误: 文件不存在 - {}", trimmed));
    }
    if !path_buf.is_file() {
        return Err(format!("DLL 路径错误: 不是文件 - {}", trimmed));
    }

    if let Some(dll_source) = state.source().as_any().downcast_ref::<DllGameDataSource>() {
        dll_source.set_dll_path(path_buf);
    } else {
        log::warn!("set_plugin_path: source is not DllGameDataSource");
    }

    log::info!("DLL path validated and applied: {}", trimmed);
    Ok(())
}

#[tauri::command]
pub fn get_plugin_path(state: tauri::State<GameDataManager>) -> String {
    state.source()
        .dll_path()
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_else(|| crate::config::get_plugin_path().to_string_lossy().to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::game_data::mock::MockGameDataSource;
    use std::sync::Arc;

    // 注意：Tauri State 的测试比较复杂，这里提供基本的单元测试
    // 实际的 command 测试应该通过集成测试完成

    #[test]
    fn test_game_data_manager_inject() {
        let mock = Arc::new(MockGameDataSource::new());
        let manager = GameDataManager::new(mock.clone());

        let result = manager.source().inject();
        assert!(result.is_ok());

        let log = mock.get_call_log();
        assert!(log.contains(&"inject".to_string()));
    }

    #[test]
    fn test_game_data_manager_inject_failure() {
        let mock = Arc::new(MockGameDataSource::new().with_inject_error());
        let manager = GameDataManager::new(mock);

        let result = manager.source().inject();
        assert!(result.is_err());
    }

    #[test]
    fn test_game_data_manager_fetch_snapshot() {
        let mock = Arc::new(MockGameDataSource::new());
        let manager = GameDataManager::new(mock.clone());

        let result = manager.source().fetch_snapshot();
        assert!(result.is_ok());

        let log = mock.get_call_log();
        assert!(log.contains(&"fetch_snapshot".to_string()));
    }

    #[test]
    fn test_game_data_manager_quit() {
        let mock = Arc::new(MockGameDataSource::new());
        let manager = GameDataManager::new(mock.clone());

        let result = manager.source().quit();
        assert!(result.is_ok());

        let log = mock.get_call_log();
        assert!(log.contains(&"quit".to_string()));
    }
}
