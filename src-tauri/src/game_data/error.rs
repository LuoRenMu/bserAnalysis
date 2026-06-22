use std::path::PathBuf;
use thiserror::Error;

#[derive(Debug, Clone, Error)]
pub enum GameDataError {
    #[error("DLL 加载失败: {path} - {error}")]
    DllLoadFailed {
        path: PathBuf,
        error: String,
    },

    #[error("注入以開始,重啓游戲或啓動將自動注入")]
    InjectFailed,

    #[error("退出失败或已经退出")]
    QuitFailed,

    #[error("无法获取游戏数据，请确保已注入且游戏正在运行")]
    FetchFailed,

    #[error("游戏数据解析失败: {0}")]
    ParseFailed(String),

    #[error("DLL 未加载")]
    NotLoaded,
}

impl GameDataError {
    pub fn dll_load_failed(path: PathBuf, error: impl ToString) -> Self {
        Self::DllLoadFailed {
            path,
            error: error.to_string(),
        }
    }
}
