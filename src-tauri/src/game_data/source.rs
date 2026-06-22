use crate::core::dll::Plugin;
use crate::core::ipc::GameSnapshot;
use crate::game_data::error::GameDataError;
use std::any::Any;
use std::path::PathBuf;
use std::sync::{Arc, RwLock};

/// 游戏数据源的统一接口
///
/// 这是一个 seam，允许不同的数据获取策略（DLL、IPC、Mock）
/// 在相同的接口下工作，使得 Commands 层可以与具体实现解耦。
pub trait GameDataSource: Send + Sync {
    /// 注入到游戏进程
    fn inject(&self) -> Result<(), GameDataError>;

    /// 退出注入
    fn quit(&self) -> Result<(), GameDataError>;

    /// 获取游戏快照
    fn fetch_snapshot(&self) -> Result<GameSnapshot, GameDataError>;

    /// 检查是否已注入且活跃
    fn is_active(&self) -> bool;

    /// 获取当前 DLL 路径
    fn dll_path(&self) -> Option<PathBuf> {
        None
    }

    /// 向具体类型向下转型
    fn as_any(&self) -> &dyn Any;
}

/// DLL 实现的游戏数据源
///
/// 使用 RwLock 而非 Mutex 提高并发读取性能。
/// Plugin 加载采用 lazy loading + 双重检查锁模式。
pub struct DllGameDataSource {
    plugin: Arc<RwLock<Option<Arc<Plugin>>>>,
    dll_path: RwLock<PathBuf>,
}

impl DllGameDataSource {
    pub fn new(dll_path: PathBuf) -> Self {
        log::info!("DllGameDataSource created with path: {}", dll_path.display());
        Self {
            plugin: Arc::new(RwLock::new(None)),
            dll_path: RwLock::new(dll_path),
        }
    }

    /// 确保 Plugin 已加载（lazy loading + 双重检查锁）
    fn ensure_loaded(&self) -> Result<Arc<Plugin>, GameDataError> {
        // 快速路径：已加载
        {
            let read_guard = self.plugin.read().unwrap();
            if let Some(plugin) = read_guard.as_ref() {
                return Ok(Arc::clone(plugin));
            }
        }

        // 慢速路径：需要加载
        let mut write_guard = self.plugin.write().unwrap();

        // 双重检查：可能在等待写锁时其他线程已加载
        if let Some(plugin) = write_guard.as_ref() {
            return Ok(Arc::clone(plugin));
        }

        let path = self.dll_path.read().unwrap().clone();
        log::info!("Loading plugin from: {}", path.display());
        let plugin = Plugin::load(path.to_string_lossy().to_string())
            .map_err(|e| {
                log::error!("Plugin load failed: {}", e);
                GameDataError::dll_load_failed(path.clone(), e)
            })?;

        let arc_plugin = Arc::new(plugin);
        *write_guard = Some(Arc::clone(&arc_plugin));

        log::info!("Plugin loaded successfully");
        Ok(arc_plugin)
    }

    /// 重新加载 Plugin（清除缓存）
    pub fn reload(&self) {
        let mut write_guard = self.plugin.write().unwrap();
        *write_guard = None;
        log::info!("Plugin cache cleared, will reload on next use");
    }

    /// 更新 DLL 路径并清除缓存
    pub fn set_dll_path(&self, path: PathBuf) {
        {
            let mut guard = self.dll_path.write().unwrap();
            *guard = path.clone();
        }
        self.reload();
        log::info!("DLL path updated to: {}", path.display());
    }
}

impl GameDataSource for DllGameDataSource {
    fn inject(&self) -> Result<(), GameDataError> {
        let plugin = self.ensure_loaded()?;

        log::info!("Attempting to inject into game process");
        if plugin.inject() {
            log::info!("Injection successful");
            Ok(())
        } else {
            log::error!("Injection failed");
            Err(GameDataError::InjectFailed)
        }
    }

    fn quit(&self) -> Result<(), GameDataError> {
        let plugin = self.ensure_loaded()?;

        log::info!("Attempting to quit injection");
        if plugin.quit() {
            log::info!("Quit successful");
            Ok(())
        } else {
            log::warn!("Quit failed or already quit");
            Err(GameDataError::QuitFailed)
        }
    }

    fn fetch_snapshot(&self) -> Result<GameSnapshot, GameDataError> {
        let plugin = self.ensure_loaded()?;

        let bytes = plugin.fetch()
            .ok_or_else(|| {
                log::error!("Failed to fetch game data from plugin");
                GameDataError::FetchFailed
            })?;

        log::debug!("Fetched {} bytes from game", bytes.len());
        Ok(GameSnapshot::from_bytes(bytes))
    }

    fn is_active(&self) -> bool {
        let read_guard = self.plugin.read().unwrap();
        read_guard.is_some()
    }

    fn dll_path(&self) -> Option<PathBuf> {
        Some(self.dll_path.read().unwrap().clone())
    }

    fn as_any(&self) -> &dyn Any {
        self
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_dll_source_creation() {
        let path = PathBuf::from("test.dll");
        let source = DllGameDataSource::new(path.clone());

        assert_eq!(source.dll_path(), Some(path));
        assert!(!source.is_active());
    }

    #[test]
    fn test_dll_source_not_active_before_load() {
        let source = DllGameDataSource::new(PathBuf::from("test.dll"));
        assert!(!source.is_active());
    }
}
