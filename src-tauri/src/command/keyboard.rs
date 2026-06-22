use crate::keyboard;

/// 开始录制下一次快捷键按下。完成后会通过 `shortcut-recorded` 事件回传组合字符串。
#[tauri::command]
pub async fn start_shortcut_recording() -> Result<(), String> {
    keyboard::start_recording()
}

/// 取消录制。
#[tauri::command]
pub async fn cancel_shortcut_recording() -> Result<(), String> {
    keyboard::cancel_recording()
}

/// 是否正在录制。
#[tauri::command]
pub async fn is_shortcut_recording() -> Result<bool, String> {
    Ok(keyboard::is_recording())
}

/// 注册 overlay 触发组合。`shortcut` 形如 `` ` ``、`Ctrl+Shift+O`、`F1`。
#[tauri::command]
pub async fn register_overlay_shortcut(shortcut: String) -> Result<(), String> {
    let combo = keyboard::parse_shortcut(&shortcut)
        .map_err(|e| format!("Invalid shortcut '{}': {}", shortcut, e))?;
    keyboard::set_overlay_combo(combo)
}

/// 清除 overlay 触发组合。
#[tauri::command]
pub async fn clear_overlay_shortcut() -> Result<(), String> {
    keyboard::clear_overlay_combo()
}
