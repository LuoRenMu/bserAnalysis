//! 全局键盘监听中心。
//!
//! 单一 `rdev::listen` 线程承载两项职责：
//! 1. **快捷键录制** —— [`start_recording`] 启动后，捕获下一个非修饰键按下事件，
//!    连同当时按下的修饰键一起组成组合键，通过 `shortcut-recorded` 事件回传前端。
//! 2. **Overlay 长按触发** —— [`set_overlay_combo`] 注册后，当组合键全部按下时
//!    显示 overlay 窗口，任一键释放时隐藏。
//!
//! 设计要点：
//! - 只有一个 rdev 监听线程（Windows 上 `SetWindowsHookEx` 全局钩子）。
//! - 状态用 `parking_lot::RwLock` 保护，命令层和监听线程共享。
//! - 事件副作用（emit、改窗口可见性）在释放锁之后执行，避免持锁阻塞 Tauri 主线程。

mod listener;
mod shortcut;

pub use listener::stop;

use std::collections::HashSet;
use std::sync::{Arc, OnceLock};

use parking_lot::RwLock;
use rdev::Key;
use tauri::{AppHandle, Emitter};

pub use shortcut::{combo_to_string, is_modifier, parse_shortcut, ShortcutError};

/// 全局单例。在 [`init`] 时填充。
static KEYBOARD_HUB: OnceLock<Arc<KeyboardHub>> = OnceLock::new();

struct KeyboardHub {
    app: AppHandle,
    state: RwLock<KeyboardState>,
}

struct KeyboardState {
    /// 是否正在录制快捷键。
    recording: bool,
    /// 当前注册的 overlay 触发组合；`None` 表示未注册。
    overlay_combo: Option<Vec<Key>>,
    /// 当前处于按下状态的键（用于组合判断）。
    pressed: HashSet<Key>,
    /// overlay 窗口当前是否可见。
    overlay_visible: bool,
}

/// 初始化键盘中心，启动监听线程。应在 Tauri `setup` 中调用一次。
pub fn init(app: AppHandle) {
    let hub = Arc::new(KeyboardHub {
        app,
        state: RwLock::new(KeyboardState {
            recording: false,
            overlay_combo: None,
            pressed: HashSet::new(),
            overlay_visible: false,
        }),
    });

    if KEYBOARD_HUB.set(hub.clone()).is_err() {
        log::warn!("Keyboard hub already initialized");
        return;
    }

    listener::start(hub);
    log::info!("Keyboard hub initialized");
}

/// 开始录制下一次快捷键按下。
pub fn start_recording() -> Result<(), String> {
    let hub = hub()?;
    hub.state.write().recording = true;
    log::info!("Shortcut recording started");
    Ok(())
}

/// 取消录制。
pub fn cancel_recording() -> Result<(), String> {
    let hub = hub()?;
    hub.state.write().recording = false;
    log::info!("Shortcut recording cancelled");
    Ok(())
}

/// 注册 overlay 触发组合。
pub fn set_overlay_combo(combo: Vec<Key>) -> Result<(), String> {
    let hub = hub()?;
    let mut state = hub.state.write();
    state.overlay_combo = Some(combo);
    state.overlay_visible = false;
    state.pressed.clear();
    log::info!("Overlay combo registered");
    Ok(())
}

/// 清除 overlay 触发组合，并隐藏窗口。
pub fn clear_overlay_combo() -> Result<(), String> {
    let hub = hub()?;
    let mut state = hub.state.write();
    state.overlay_combo = None;
    state.overlay_visible = false;
    state.pressed.clear();
    Ok(())
}

/// 是否正在录制。
pub fn is_recording() -> bool {
    KEYBOARD_HUB
        .get()
        .map(|hub| hub.state.read().recording)
        .unwrap_or(false)
}

/// 由监听线程调用：分发一个 rdev 事件。
fn dispatch_event(event: &rdev::Event, hub: &KeyboardHub) {
    let (key, is_press) = match &event.event_type {
        rdev::EventType::KeyPress(k) => (*k, true),
        rdev::EventType::KeyRelease(k) => (*k, false),
        _ => return,
    };

    // 1) 录制：在更新 pressed 之前处理，以便捕获当前已按下的修饰键。
    let recording_action = if is_press {
        try_complete_recording(key, hub)
    } else {
        RecordingOutcome::None
    };

    if let RecordingOutcome::Completed(combo_string) = recording_action {
        log::info!("Shortcut recorded: {}", combo_string);
        let _ = hub.app.emit("shortcut-recorded", combo_string);
        return;
    }

    // 2) 更新 pressed 集合。
    let side_effect = {
        let mut state = hub.state.write();
        if is_press {
            state.pressed.insert(key);
        } else {
            state.pressed.remove(&key);
        }
        evaluate_overlay_side_effect(&mut state, key, is_press)
    };

    // 3) 执行副作用（释放锁之后）。
    if let Some(OverlayAction::Show) = side_effect {
        if let Err(e) = crate::overlay::window::set_overlay_visible(&hub.app, true) {
            log::error!("Failed to show overlay window: {}", e);
        }
        let _ = hub.app.emit("overlay-show", ());
    } else if let Some(OverlayAction::Hide) = side_effect {
        if let Err(e) = crate::overlay::window::set_overlay_visible(&hub.app, false) {
            log::error!("Failed to hide overlay window: {}", e);
        }
        let _ = hub.app.emit("overlay-hide", ());
    }
}

enum RecordingOutcome {
    None,
    Completed(String),
}

fn try_complete_recording(key: Key, hub: &KeyboardHub) -> RecordingOutcome {
    let mut state = hub.state.write();
    if !state.recording {
        return RecordingOutcome::None;
    }
    if is_modifier(key) {
        // 修饰键按下只更新 pressed，等非修饰键才完成录制。
        state.pressed.insert(key);
        return RecordingOutcome::None;
    }
    // 非修饰键：组合 = 当前按下的修饰键 + 这个键。
    let mut combo: Vec<Key> = state
        .pressed
        .iter()
        .filter(|k| is_modifier(**k))
        .copied()
        .collect();
    combo.push(key);
    state.recording = false;
    state.pressed.insert(key);
    RecordingOutcome::Completed(combo_to_string(&combo))
}

enum OverlayAction {
    Show,
    Hide,
}

fn evaluate_overlay_side_effect(
    state: &mut KeyboardState,
    key: Key,
    is_press: bool,
) -> Option<OverlayAction> {
    let combo = state.overlay_combo.as_ref()?;
    if is_press {
        if !state.overlay_visible && combo.iter().all(|k| state.pressed.contains(k)) {
            state.overlay_visible = true;
            return Some(OverlayAction::Show);
        }
    } else if state.overlay_visible && combo.contains(&key) {
        state.overlay_visible = false;
        return Some(OverlayAction::Hide);
    }
    None
}

fn hub() -> Result<Arc<KeyboardHub>, String> {
    KEYBOARD_HUB
        .get()
        .cloned()
        .ok_or_else(|| "keyboard hub not initialized".to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn modifier_detection() {
        assert!(is_modifier(Key::ControlLeft));
        assert!(is_modifier(Key::ShiftRight));
        assert!(is_modifier(Key::Alt));
        assert!(is_modifier(Key::MetaLeft));
        assert!(!is_modifier(Key::KeyO));
        assert!(!is_modifier(Key::BackQuote));
    }

    #[test]
    fn overlay_single_key_show_then_hide() {
        let mut state = KeyboardState {
            recording: false,
            overlay_combo: Some(vec![Key::BackQuote]),
            pressed: HashSet::new(),
            overlay_visible: false,
        };

        // 按下 BackQuote -> 应显示
        state.pressed.insert(Key::BackQuote);
        let action = evaluate_overlay_side_effect(&mut state, Key::BackQuote, true);
        assert!(matches!(action, Some(OverlayAction::Show)));
        assert!(state.overlay_visible);

        // 释放 BackQuote -> 应隐藏
        state.pressed.remove(&Key::BackQuote);
        let action = evaluate_overlay_side_effect(&mut state, Key::BackQuote, false);
        assert!(matches!(action, Some(OverlayAction::Hide)));
        assert!(!state.overlay_visible);
    }

    #[test]
    fn overlay_combo_requires_all_keys() {
        let mut state = KeyboardState {
            recording: false,
            overlay_combo: Some(vec![Key::ControlLeft, Key::KeyO]),
            pressed: HashSet::new(),
            overlay_visible: false,
        };

        // 只按 Ctrl -> 不显示
        state.pressed.insert(Key::ControlLeft);
        assert!(evaluate_overlay_side_effect(&mut state, Key::ControlLeft, true).is_none());

        // 再按 O -> 显示
        state.pressed.insert(Key::KeyO);
        let action = evaluate_overlay_side_effect(&mut state, Key::KeyO, true);
        assert!(matches!(action, Some(OverlayAction::Show)));
        assert!(state.overlay_visible);

        // 释放任一 -> 隐藏
        state.pressed.remove(&Key::ControlLeft);
        let action = evaluate_overlay_side_effect(&mut state, Key::ControlLeft, false);
        assert!(matches!(action, Some(OverlayAction::Hide)));
        assert!(!state.overlay_visible);
    }

    #[test]
    fn overlay_repeat_press_does_not_double_show() {
        let mut state = KeyboardState {
            recording: false,
            overlay_combo: Some(vec![Key::BackQuote]),
            pressed: HashSet::from([Key::BackQuote]),
            overlay_visible: true,
        };
        // 重复 KeyPress 不应再次触发 Show
        let action = evaluate_overlay_side_effect(&mut state, Key::BackQuote, true);
        assert!(action.is_none());
    }
}
