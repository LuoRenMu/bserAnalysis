use std::io;

pub type Result<T> = std::result::Result<T, RequestError>;

#[derive(Debug, thiserror::Error)]
pub enum RequestError {
    #[error("request failed: {0}")]
    Http(#[from] reqwest::Error),
    #[error("json decode failed: {0}")]
    Json(#[from] serde_json::Error),
    #[error("io failed: {0}")]
    Io(#[from] io::Error),
    #[error("remote server refused the request")]
    Forbidden,
    #[error("unexpected http status {status} for {url}")]
    HttpStatus { status: u16, url: String },
    #[error("nickname not found: {0}")]
    NicknameNotFound(String),
    #[error("unexpected DakGG response")]
    UnexpectedDakGgResponse,
    #[error("not found: {0}")]
    NotFound(String),
}
