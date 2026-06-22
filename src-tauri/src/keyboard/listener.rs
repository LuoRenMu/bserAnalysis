//! rdev 键盘监听线程。
//!
//! 使用 `rdev::listen` 安装 `WH_KEYBOARD_LL` 全局钩子。rdev 内部用
//! `GetMessageA` 维持消息泵，钩子回调在其阻塞期间被 Windows 调用。
//!
//! 进程退出时通过 [`stop`] 向监听线程投递 `WM_QUIT`，使 `GetMessageA`
//! 返回、`listen` 退出、线程正常结束，避免线程泄漏。

use std::sync::{Arc, OnceLock};

use rdev::{listen, Event};
use windows::Win32::Foundation::{LPARAM, WPARAM};
use windows::Win32::System::Threading::GetCurrentThreadId;
use windows::Win32::UI::WindowsAndMessaging::{PostThreadMessageW, WM_QUIT};

use super::{dispatch_event, KeyboardHub};

static HUB: OnceLock<Arc<KeyboardHub>> = OnceLock::new();
static LISTENER_THREAD_ID: OnceLock<u32> = OnceLock::new();

/// 启动监听线程。线程生命周期与进程相同，退出时调用 [`stop`]。
pub fn start(hub: Arc<KeyboardHub>) {
    if HUB.set(hub).is_err() {
        log::warn!("Keyboard listener hub already set");
        return;
    }

    std::thread::Builder::new()
        .name("rdev-keyboard-listener".to_string())
        .spawn(move || {
            let thread_id = unsafe { GetCurrentThreadId() };
            let _ = LISTENER_THREAD_ID.set(thread_id);
            log::info!("rdev keyboard listener starting (thread_id={})", thread_id);

            if let Err(error) = listen(move |event: Event| {
                if let Some(hub) = HUB.get() {
                    dispatch_event(&event, hub);
                }
            }) {
                log::error!("rdev listen error: {:?}", error);
            }
            log::info!("rdev keyboard listener stopped");
        })
        .expect("failed to spawn rdev keyboard listener thread");
}

/// 通知监听线程退出。在 Tauri `RunEvent::Exit` 时调用。
pub fn stop() {
    if let Some(&thread_id) = LISTENER_THREAD_ID.get() {
        unsafe {
            let _ = PostThreadMessageW(thread_id, WM_QUIT, WPARAM(0), LPARAM(0));
        }
        log::info!("Sent WM_QUIT to rdev listener thread {}", thread_id);
    }
}
