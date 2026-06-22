use crate::core::ipc::GameSnapshot;
use crate::game_data::error::GameDataError;
use crate::game_data::source::GameDataSource;
use std::any::Any;
use std::sync::{Arc, Mutex};

/// 测试用的 Mock 游戏数据源
///
/// 允许在测试中预设行为和验证调用。
pub struct MockGameDataSource {
    pub inject_result: Result<(), GameDataError>,
    pub quit_result: Result<(), GameDataError>,
    pub snapshot: GameSnapshot,
    pub is_active: bool,
    pub call_log: Arc<Mutex<Vec<String>>>,
}

impl MockGameDataSource {
    pub fn new() -> Self {
        Self {
            inject_result: Ok(()),
            quit_result: Ok(()),
            snapshot: GameSnapshot::default(),
            is_active: false,
            call_log: Arc::new(Mutex::new(Vec::new())),
        }
    }

    pub fn with_inject_error(mut self) -> Self {
        self.inject_result = Err(GameDataError::InjectFailed);
        self
    }

    pub fn with_snapshot(mut self, snapshot: GameSnapshot) -> Self {
        self.snapshot = snapshot;
        self
    }

    pub fn get_call_log(&self) -> Vec<String> {
        self.call_log.lock().unwrap().clone()
    }

    fn log_call(&self, method: &str) {
        self.call_log.lock().unwrap().push(method.to_string());
    }
}

impl Default for MockGameDataSource {
    fn default() -> Self {
        Self::new()
    }
}

impl GameDataSource for MockGameDataSource {
    fn inject(&self) -> Result<(), GameDataError> {
        self.log_call("inject");
        self.inject_result.clone()
    }

    fn quit(&self) -> Result<(), GameDataError> {
        self.log_call("quit");
        self.quit_result.clone()
    }

    fn fetch_snapshot(&self) -> Result<GameSnapshot, GameDataError> {
        self.log_call("fetch_snapshot");
        Ok(self.snapshot.clone())
    }

    fn is_active(&self) -> bool {
        self.log_call("is_active");
        self.is_active
    }

    fn as_any(&self) -> &dyn Any {
        self
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_mock_default_behavior() {
        let mock = MockGameDataSource::new();

        assert!(mock.inject().is_ok());
        assert!(mock.quit().is_ok());
        assert!(mock.fetch_snapshot().is_ok());
        assert!(!mock.is_active());
    }

    #[test]
    fn test_mock_inject_error() {
        let mock = MockGameDataSource::new().with_inject_error();

        assert!(mock.inject().is_err());
    }

    #[test]
    fn test_mock_call_logging() {
        let mock = MockGameDataSource::new();

        let _ = mock.inject();
        let _ = mock.fetch_snapshot();
        let _ = mock.is_active();

        let log = mock.get_call_log();
        assert_eq!(log, vec!["inject", "fetch_snapshot", "is_active"]);
    }
}
