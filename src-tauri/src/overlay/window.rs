//! 游戏覆盖层窗口管理。
//!
//! 负责创建一个透明、无边框、置顶、click-through 的 Tauri 窗口，
//! 加载前端 `/game-overlay` 路由。窗口启动时隐藏，首次显示后复用同一个 WebView；
//! 隐藏时最小化窗口，避免透明窗口残留背景。

use std::sync::atomic::{AtomicBool, Ordering};

use tauri::{AppHandle, Emitter, Manager, WebviewUrl, WebviewWindow, WebviewWindowBuilder};

/// Overlay 窗口的 Tauri label —— 与前端路由、capability 配置共享。
pub const OVERLAY_LABEL: &str = "game-overlay";
static OVERLAY_PAGE_VISIBLE: AtomicBool = AtomicBool::new(false);

/// Overlay 窗口相对屏幕的比例。
const OVERLAY_WIDTH_RATIO: f64 = 0.55;
const OVERLAY_HEIGHT_RATIO: f64 = 0.90;

/// 在应用启动时创建 overlay 窗口。重复调用是幂等的。
pub fn create_overlay_window(app: &AppHandle) -> Result<WebviewWindow, String> {
    if let Some(existing) = app.get_webview_window(OVERLAY_LABEL) {
        return Ok(existing);
    }

    let (x, y, width, height) = centered_geometry(app);

    let window =
        WebviewWindowBuilder::new(app, OVERLAY_LABEL, WebviewUrl::App("game-overlay".into()))
            .title("")
            .inner_size(width, height)
            .position(x, y)
            .decorations(false)
            .transparent(true)
            .always_on_top(true)
            .skip_taskbar(true)
            .focused(false)
            .visible(false)
            .build()
            .map_err(|e| format!("Failed to create overlay window: {}", e))?;

    // 让窗口对鼠标事件透明，游戏可以正常接收点击。
    if let Err(e) = window.set_ignore_cursor_events(true) {
        log::warn!("Failed to set ignore cursor events: {}", e);
    }

    log::info!(
        "Overlay window created at ({}, {}) size {}x{}",
        x,
        y,
        width,
        height
    );
    Ok(window)
}

/// 显示或隐藏 overlay 页面内容。隐藏时最小化窗口，但不销毁 WebView。
pub fn set_overlay_visible(app: &AppHandle, visible: bool) -> Result<(), String> {
    let window = app
        .get_webview_window(OVERLAY_LABEL)
        .ok_or_else(|| "overlay window not created".to_string())?;

    if visible {
        if !window.is_visible().unwrap_or(false) {
            window.show().map_err(|e| format!("show() failed: {}", e))?;
        }
        window
            .unminimize()
            .map_err(|e| format!("unminimize() failed: {}", e))?;
        // 重新置顶并保持 click-through（可能在运行期间被改动）。
        let _ = window.set_always_on_top(true);
        let _ = window.set_ignore_cursor_events(true);

        let previous = OVERLAY_PAGE_VISIBLE.swap(true, Ordering::SeqCst);
        if !previous {
            app.emit_to(OVERLAY_LABEL, "overlay-show", ())
                .map_err(|e| format!("emit_to overlay-show failed: {}", e))?;
        }
    } else {
        let previous = OVERLAY_PAGE_VISIBLE.swap(false, Ordering::SeqCst);
        if previous {
            app.emit_to(OVERLAY_LABEL, "overlay-hide", ())
                .map_err(|e| format!("emit_to overlay-hide failed: {}", e))?;
        }
        if window.is_visible().unwrap_or(false) {
            window
                .minimize()
                .map_err(|e| format!("minimize() failed: {}", e))?;
        }
    }

    log::debug!("Overlay page visibility set to {}", visible);
    Ok(())
}

/// 当前 overlay 页面内容是否可见。
pub fn is_overlay_visible(app: &AppHandle) -> bool {
    if app.get_webview_window(OVERLAY_LABEL).is_none() {
        return false;
    }
    OVERLAY_PAGE_VISIBLE.load(Ordering::SeqCst)
}

/// 计算 overlay 窗口在主显示器正中央的位置和尺寸（按屏幕比例）。
fn centered_geometry(app: &AppHandle) -> (f64, f64, f64, f64) {
    match app.primary_monitor() {
        Ok(Some(monitor)) => {
            let size = monitor.size();
            let pos = monitor.position();
            let screen_w = size.width as f64;
            let screen_h = size.height as f64;
            let width = (screen_w * OVERLAY_WIDTH_RATIO).round();
            let height = (screen_h * OVERLAY_HEIGHT_RATIO).round();
            let x = pos.x as f64 + (screen_w - width) / 2.0;
            let y = pos.y as f64 + (screen_h - height) / 2.0;
            (x.max(0.0), y.max(0.0), width, height)
        }
        _ => (100.0, 80.0, 380.0, 900.0),
    }
}
