use serde::{Deserialize, Serialize};

#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WafRule {
    pub id: String,
    pub zone_id: String,
    pub name: String,
    pub description: String,
    pub expression: String,
    pub action: String,
    pub enabled: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IpRule {
    pub id: String,
    pub zone_id: String,
    pub rule_type: IpRuleType,
    pub ip: String,
    pub ip_range: Option<String>,
    pub enabled: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum IpRuleType {
    Whitelist,
    Blacklist,
}

/// Cloudflare IP Access Rule（匹配 CF API 响应）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CfAccessRule {
    pub id: String,
    pub mode: String,
    pub configuration: CfAccessRuleConfig,
    #[serde(default)]
    pub notes: String,
    #[serde(default)]
    pub created_on: Option<String>,
    #[serde(default)]
    pub modified_on: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CfAccessRuleConfig {
    pub target: String,
    pub value: String,
}

#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DdosSettings {
    pub zone_id: String,
    pub enabled: bool,
    pub sensitivity: String,
}

#[allow(dead_code)]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RateLimit {
    pub id: String,
    pub zone_id: String,
    pub threshold: u32,
    pub period: u32,
    pub action: String,
}
