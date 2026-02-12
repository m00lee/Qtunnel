use serde::Serialize;
use thiserror::Error;

#[derive(Error, Debug, Serialize, Clone)]
pub enum AppError {
    #[error("Database error: {0}")]
    DatabaseError(String),

    #[error("API error: {0}")]
    ApiError(String),

    #[error("Invalid token")]
    InvalidToken,

    #[error("Tunnel not found")]
    TunnelNotFound,

    #[error("Service not found")]
    ServiceNotFound,

    #[error("Route not found")]
    RouteNotFound,

    #[error("Configuration error: {0}")]
    ConfigError(String),

    #[error("Network error: {0}")]
    NetworkError(String),

    #[error("Unauthorized")]
    Unauthorized,

    #[error("Internal server error")]
    InternalError,
}

impl AppError {
    pub fn code(&self) -> u32 {
        match self {
            AppError::DatabaseError(_) => 1001,
            AppError::ApiError(_) => 1002,
            AppError::InvalidToken => 1003,
            AppError::TunnelNotFound => 1004,
            AppError::ServiceNotFound => 1005,
            AppError::RouteNotFound => 1006,
            AppError::ConfigError(_) => 1007,
            AppError::NetworkError(_) => 1008,
            AppError::Unauthorized => 1009,
            AppError::InternalError => 1010,
        }
    }
}

// 让 AppError 可以直接作为 Tauri command 返回的 Err 类型
impl From<AppError> for String {
    fn from(err: AppError) -> Self {
        serde_json::to_string(&err).unwrap_or_else(|_| err.to_string())
    }
}
