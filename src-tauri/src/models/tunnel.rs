use serde::{Deserialize, Serialize};

// ======== Tunnel ========

/// CF API: GET /accounts/:account_id/cfd_tunnel
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Tunnel {
    pub id: String,
    pub name: String,
    #[serde(default)]
    pub status: String,
    #[serde(default)]
    pub account_tag: Option<String>,
    #[serde(default)]
    pub created_at: Option<String>,
    #[serde(default)]
    pub deleted_at: Option<String>,
    #[serde(default)]
    pub tun_type: Option<String>,
    #[serde(default)]
    pub remote_config: bool,
    #[serde(default)]
    pub conns_active_at: Option<String>,
    #[serde(default)]
    pub conns_inactive_at: Option<String>,
    #[serde(default)]
    pub connections: Vec<TunnelConnection>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TunnelConnection {
    #[serde(default)]
    pub id: String,
    #[serde(default)]
    pub colo_name: Option<String>,
    #[serde(default)]
    pub is_pending_reconnect: bool,
    #[serde(default)]
    pub origin_ip: Option<String>,
    #[serde(default)]
    pub opened_at: Option<String>,
    #[serde(default)]
    pub client_id: Option<String>,
    #[serde(default)]
    pub client_version: Option<String>,
}

// ======== Zone ========

/// CF API: GET /zones
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Zone {
    pub id: String,
    pub name: String,
    #[serde(default)]
    pub status: String,
    #[serde(default)]
    pub paused: bool,
}

// ======== Ingress Rule ========

/// 隧道配置中的 ingress 条目
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CfIngressRule {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub hostname: Option<String>,
    pub service: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub path: Option<String>,
    #[serde(default, rename = "originRequest", skip_serializing_if = "Option::is_none")]
    pub origin_request: Option<serde_json::Value>,
}

// ======== Quick Bind Result ========

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct QuickBindResult {
    pub hostname: String,
    pub service: String,
    pub dns_record_id: String,
    pub tunnel_id: String,
}

// ======== Token Verify ========

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TokenVerifyResult {
    pub id: String,
    pub status: String,
    #[serde(default)]
    pub not_before: Option<String>,
    #[serde(default)]
    pub expires_on: Option<String>,
    #[serde(default)]
    pub message: Option<String>,
    #[serde(default)]
    pub permissions: Vec<TokenPermission>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TokenPermission {
    pub effect: String,
    #[serde(default)]
    pub resources: Vec<String>,
    #[serde(default)]
    pub permission_groups: Vec<String>,
}
