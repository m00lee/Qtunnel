use serde::{Deserialize, Serialize};

pub mod tunnel;
pub mod route;
pub mod local_service;
pub mod certificate;
pub mod security;
pub mod script;

pub use tunnel::*;
pub use route::*;
pub use local_service::*;
pub use certificate::*;
pub use security::*;
pub use script::*;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApiError {
    pub code: u32,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApiResponse<T> {
    pub success: bool,
    pub data: Option<T>,
    pub error: Option<ApiError>,
}

impl<T> ApiResponse<T> {
    pub fn ok(data: T) -> Self {
        ApiResponse {
            success: true,
            data: Some(data),
            error: None,
        }
    }

    pub fn err(code: u32, message: String) -> Self {
        ApiResponse {
            success: false,
            data: None,
            error: Some(ApiError { code, message }),
        }
    }
}
