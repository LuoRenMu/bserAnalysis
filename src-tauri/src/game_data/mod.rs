pub mod source;
pub mod error;

pub use source::{GameDataSource, DllGameDataSource};
pub use error::GameDataError;

use std::sync::Arc;

/// 游戏数据管理器，用于 Tauri state management
pub struct GameDataManager {
    source: Arc<dyn GameDataSource>,
}

impl GameDataManager {
    pub fn new(source: Arc<dyn GameDataSource>) -> Self {
        Self { source }
    }

    pub fn source(&self) -> &Arc<dyn GameDataSource> {
        &self.source
    }
}

#[cfg(test)]
pub mod mock;
