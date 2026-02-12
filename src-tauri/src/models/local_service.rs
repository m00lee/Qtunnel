use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};

#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LocalService {
    pub id: String,
    pub tunnel_id: String,
    pub name: String,
    pub local_addr: String,
    pub local_port: u16,
    pub subdomain: String,
    pub status: ServiceStatus,
    pub created_at: DateTime<Utc>,
}

#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum ServiceStatus {
    #[serde(rename = "active")]
    Active,
    #[serde(rename = "inactive")]
    Inactive,
    #[serde(rename = "error")]
    Error,
}

#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServiceMetrics {
    pub service_id: String,
    pub total_requests: u64,
    pub total_bytes_in: u64,
    pub total_bytes_out: u64,
    pub uptime_seconds: u64,
    pub last_check: DateTime<Utc>,
}

#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BindServiceRequest {
    pub tunnel_id: String,
    pub name: String,
    pub local_addr: String,
    pub local_port: u16,
    pub subdomain: String,
}
