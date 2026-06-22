use crate::overlay::{is_overlay_visible, set_overlay_visible, OverlayManager};

#[tauri::command]
pub async fn start_overlay_monitoring(
    manager: tauri::State<'_, OverlayManager>,
) -> Result<(), String> {
    log::info!("Starting overlay monitoring");
    manager.start_monitoring();
    Ok(())
}

#[tauri::command]
pub async fn stop_overlay_monitoring(
    manager: tauri::State<'_, OverlayManager>,
) -> Result<(), String> {
    log::info!("Stopping overlay monitoring");
    manager.stop_monitoring();
    Ok(())
}

#[tauri::command]
pub async fn is_overlay_monitoring(
    manager: tauri::State<'_, OverlayManager>,
) -> Result<bool, String> {
    Ok(manager.is_monitoring())
}

/// 显示 overlay 窗口（测试用；正常运行由键盘中心驱动）。
#[tauri::command]
pub async fn show_overlay_window(app: tauri::AppHandle) -> Result<(), String> {
    set_overlay_visible(&app, true)
}

/// 隐藏 overlay 窗口。
#[tauri::command]
pub async fn hide_overlay_window(app: tauri::AppHandle) -> Result<(), String> {
    set_overlay_visible(&app, false)
}

/// 切换 overlay 窗口可见性。
#[tauri::command]
pub async fn toggle_overlay_window(app: tauri::AppHandle) -> Result<bool, String> {
    let next = !is_overlay_visible(&app);
    set_overlay_visible(&app, next)?;
    Ok(next)
}

/// 查询 overlay 窗口当前是否可见。
#[tauri::command]
pub async fn is_overlay_window_visible(app: tauri::AppHandle) -> Result<bool, String> {
    Ok(is_overlay_visible(&app))
}
