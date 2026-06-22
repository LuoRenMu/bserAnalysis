use crate::core::ipc::GameSnapshot;
use crate::game_data::GameDataSource;
use std::sync::{Arc, RwLock};
use std::time::Duration;
use tauri::{AppHandle, Emitter};
use tokio::task::JoinHandle;

/// Overlay 管理器
///
/// 深模块设计：
/// - Interface: start_monitoring() / stop_monitoring() 两个方法
/// - Implementation: 后台轮询 + 窗口更新 + 生命周期管理
///
/// 职责：
/// 1. 订阅游戏数据源（通过轮询）
/// 2. 检测游戏状态变化
/// 3. 自动更新 overlay 窗口
/// 4. 管理监控任务生命周期
pub struct OverlayManager {
    app_handle: AppHandle,
    data_source: Arc<dyn GameDataSource>,
    monitoring_task: Arc<RwLock<Option<JoinHandle<()>>>>,
    current_snapshot: Arc<RwLock<Option<GameSnapshot>>>,
}

impl OverlayManager {
    pub fn new(app_handle: AppHandle, data_source: Arc<dyn GameDataSource>) -> Self {
        Self {
            app_handle,
            data_source,
            monitoring_task: Arc::new(RwLock::new(None)),
            current_snapshot: Arc::new(RwLock::new(None)),
        }
    }

    /// 开始监控游戏数据
    ///
    /// 启动后台任务轮询游戏数据源，自动更新 overlay 窗口。
    /// 如果已经在监控，此调用是幂等的（不会启动重复任务）。
    pub fn start_monitoring(&self) {
        let mut task_guard = self.monitoring_task.write().unwrap();

        // 幂等性检查：如果已经在运行，不重复启动
        if task_guard.is_some() {
            log::info!("Overlay monitoring already active");
            return;
        }

        log::info!("Starting overlay monitoring");

        let app_handle = self.app_handle.clone();
        let data_source = Arc::clone(&self.data_source);
        let snapshot_store = Arc::clone(&self.current_snapshot);

        let handle = tokio::spawn(async move {
            let mut poll_interval = Duration::from_millis(1000);

            loop {
                tokio::time::sleep(poll_interval).await;

                // 尝试获取游戏快照
                match data_source.fetch_snapshot() {
                    Ok(snapshot) => {
                        // 检查游戏是否结束
                        if snapshot.command == 0 {
                            log::info!("Game ended, stopping overlay monitoring");
                            break;
                        }

                        // 根据游戏状态调整轮询频率
                        poll_interval = if snapshot.is_game_started {
                            Duration::from_millis(3000) // 游戏中降频
                        } else {
                            Duration::from_millis(1000) // 选人阶段高频
                        };

                        // 更新存储的快照
                        {
                            let mut store = snapshot_store.write().unwrap();
                            *store = Some(snapshot.clone());
                        }

                        // 通知窗口更新
                        if let Err(e) = app_handle.emit("overlay-data-updated", &snapshot) {
                            log::error!("Failed to emit overlay update: {}", e);
                        }
                    }
                    Err(e) => {
                        log::warn!("Failed to fetch game snapshot: {}", e);
                    }
                }
            }

            log::info!("Overlay monitoring task finished");
        });

        *task_guard = Some(handle);
    }

    /// 停止监控游戏数据
    ///
    /// 取消后台轮询任务。如果没有在监控，此调用是幂等的。
    pub fn stop_monitoring(&self) {
        let mut task_guard = self.monitoring_task.write().unwrap();

        if let Some(handle) = task_guard.take() {
            log::info!("Stopping overlay monitoring");
            handle.abort();

            // 清除快照数据
            let mut snapshot_store = self.current_snapshot.write().unwrap();
            *snapshot_store = None;
        }
    }

    /// 获取当前游戏快照（只读）
    pub fn current_snapshot(&self) -> Option<GameSnapshot> {
        self.current_snapshot.read().unwrap().clone()
    }

    /// 检查是否正在监控
    pub fn is_monitoring(&self) -> bool {
        self.monitoring_task.read().unwrap().is_some()
    }
}

impl Drop for OverlayManager {
    fn drop(&mut self) {
        self.stop_monitoring();
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::game_data::mock::MockGameDataSource;

    // Note: 测试需要 Tauri AppHandle，这里只测试逻辑
    // 实际的集成测试在 commands 层进行

    #[test]
    fn test_is_monitoring_initially_false() {
        // 无法在单元测试中创建 AppHandle
        // 此测试占位，实际测试在集成测试中
    }
}
