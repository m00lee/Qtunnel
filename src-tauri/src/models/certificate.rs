#[allow(dead_code)]
use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};

#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Certificate {
    pub id: String,
    pub zone_id: String,
    pub hostname: String,
    pub certificate_type: String,
    pub status: String,
    pub expires_on: DateTime<Utc>,
    pub created_at: DateTime<Utc>,
}

#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CertificateRequest {
    pub zone_id: String,
    pub hostname: String,
    pub certificate_type: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DnsRecord {
    pub id: String,
    pub zone_id: String,
    pub name: String,
    #[serde(rename = "type")]
    pub record_type: String,
    pub content: String,
    pub ttl: u32,
    pub proxied: bool,
}
