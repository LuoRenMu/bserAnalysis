use crate::core::ipc::GameSnapshot;
use crate::core::plugin_state::PluginState;

#[tauri::command]
pub fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
pub fn inject(state: tauri::State<PluginState>) -> Result<bool, String> {
    Ok(state.inject())
}

#[tauri::command]
pub fn quit(state: tauri::State<PluginState>) -> Result<bool, String> {
    Ok(state.quit())
}

#[tauri::command]
pub fn fetch(state: tauri::State<PluginState>) -> Result<GameSnapshot, String> {
    let bytes = state
        .fetch()
        .ok_or_else(|| "无法获取游戏数据，请确保已注入且游戏正在运行".to_string())?;
    Ok(GameSnapshot::from_bytes(bytes))
}

#[tauri::command]
pub fn load(
    state: tauri::State<PluginState>,
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

    state.load(trimmed)
}

#[tauri::command]
pub fn get_plugin_path() -> String {
    crate::config::get_plugin_path().to_string_lossy().to_string()
}
