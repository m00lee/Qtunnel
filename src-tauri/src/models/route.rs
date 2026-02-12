use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Route {
    pub id: String,
    pub tunnel_id: String,
    pub hostname: String,
    pub service: String,
    pub path: Option<String>,
    pub priority: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateRouteRequest {
    pub tunnel_id: String,
    pub hostname: String,
    pub service: String,
    pub path: Option<String>,
    pub priority: u32,
}
