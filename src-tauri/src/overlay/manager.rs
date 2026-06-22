use crate::core::dll::Plugin;
use crate::core::ipc::GameSnapshot;
use std::sync::{Arc, RwLock};
use std::time::Duration;
use tauri::{AppHandle, Emitter};
use tokio::task::JoinHandle;

/// Overlay 管理器
///
/// 直接持有共享的 `Plugin` 句柄，轮询 `Plugin::fetch` 获取游戏快照并
/// 推送给 overlay 窗口。与 `run_dll` 参考流程共用同一个 Plugin 实例。
pub struct OverlayManager {
    app_handle: AppHandle,
    plugin: Arc<RwLock<Option<Plugin>>>,
    monitoring_task: Arc<RwLock<Option<JoinHandle<()>>>>,
    current_snapshot: Arc<RwLock<Option<GameSnapshot>>>,
}

impl OverlayManager {
    pub fn new(app_handle: AppHandle, plugin: Arc<RwLock<Option<Plugin>>>) -> Self {
        Self {
            app_handle,
            plugin,
            monitoring_task: Arc::new(RwLock::new(None)),
            current_snapshot: Arc::new(RwLock::new(None)),
        }
    }

    /// 开始监控游戏数据。幂等：已在运行时不重复启动。
    pub fn start_monitoring(&self) {
        let mut task_guard = self.monitoring_task.write().unwrap();

        if task_guard.is_some() {
            log::info!("Overlay monitoring already active");
            return;
        }

        log::info!("Starting overlay monitoring");

        let app_handle = self.app_handle.clone();
        let plugin = Arc::clone(&self.plugin);
        let snapshot_store = Arc::clone(&self.current_snapshot);

        let handle = tokio::spawn(async move {
            let mut poll_interval = Duration::from_millis(1000);
            let mut none_count: u32 = 0;

            loop {
                tokio::time::sleep(poll_interval).await;

                let bytes = {
                    let guard = plugin.read().unwrap();
                    guard.as_ref().and_then(|p| p.fetch())
                };

                match bytes {
                    Some(bytes) => {
                        none_count = 0;
                        let snapshot = GameSnapshot::from_bytes(bytes);

                        poll_interval = if snapshot.is_game_started {
                            Duration::from_millis(2000)
                        } else {
                            Duration::from_millis(1000)
                        };

                        {
                            let mut store = snapshot_store.write().unwrap();
                            *store = Some(snapshot.clone());
                        }

                        if let Err(e) = app_handle.emit("overlay-data-updated", &snapshot) {
                            log::error!("Failed to emit overlay update: {}", e);
                        }
                    }
                    None => {
                        none_count += 1;
                        if none_count >= 3 {
                            log::info!("Injection lost (fetch None x{none_count}), stopping monitoring");
                            let _ = app_handle.emit("overlay-injection-lost", ());
                            break;
                        }
                    }
                }
            }
        });

        *task_guard = Some(handle);
    }

    /// 停止监控。幂等。
    pub fn stop_monitoring(&self) {
        let mut task_guard = self.monitoring_task.write().unwrap();

        if let Some(handle) = task_guard.take() {
            log::info!("Stopping overlay monitoring");
            handle.abort();

            let mut snapshot_store = self.current_snapshot.write().unwrap();
            *snapshot_store = None;
        }
    }

    pub fn current_snapshot(&self) -> Option<GameSnapshot> {
        self.current_snapshot.read().unwrap().clone()
    }

    pub fn is_monitoring(&self) -> bool {
        self.monitoring_task.read().unwrap().is_some()
    }
}

impl Drop for OverlayManager {
    fn drop(&mut self) {
        self.stop_monitoring();
    }
}
