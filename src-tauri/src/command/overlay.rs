use std::sync::atomic::{AtomicBool, Ordering};

use tauri::Emitter;
use crate::overlay::{is_overlay_visible, set_overlay_visible, OverlayManager, OVERLAY_LABEL};

/// 全局标记：Settings 点预览时置 true，GameOverlay 挂载后取走。
static MOCK_REQUESTED: AtomicBool = AtomicBool::new(false);

#[tauri::command]
pub async fn start_overlay_monitoring(
    manager: tauri::State<'_, OverlayManager>,
) -> Result<(), String> {
    manager.start_monitoring();
    Ok(())
}

#[tauri::command]
pub async fn stop_overlay_monitoring(
    manager: tauri::State<'_, OverlayManager>,
) -> Result<(), String> {
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

/// 向 overlay 窗口发送 mock 预览事件（Settings 预览按钮调用）。
/// 同时置 MOCK_REQUESTED 标记，供 GameOverlay 挂载后轮询取走。
#[tauri::command]
pub async fn emit_overlay_mock(app: tauri::AppHandle) -> Result<(), String> {
    MOCK_REQUESTED.store(true, Ordering::SeqCst);
    app.emit_to(OVERLAY_LABEL, "overlay-mock-preview", ())
        .map_err(|e| format!("emit_to failed: {}", e))
}

/// GameOverlay 挂载后调用：取走 mock 请求标记，若为 true 则前端应展示 mock 数据。
#[tauri::command]
pub async fn try_take_overlay_mock() -> Result<bool, String> {
    Ok(MOCK_REQUESTED.swap(false, Ordering::SeqCst))
}

/// 向 overlay 窗口发送背景透明度更新事件。
#[tauri::command]
pub async fn emit_overlay_opacity(app: tauri::AppHandle, opacity: f64) -> Result<(), String> {
    app.emit_to(OVERLAY_LABEL, "overlay-opacity-updated", opacity)
        .map_err(|e| format!("emit_to failed: {}", e))
}
