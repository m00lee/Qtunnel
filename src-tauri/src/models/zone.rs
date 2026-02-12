use serde::{Deserialize, Serialize};

// ======== Zone Analytics ========

/// 流量分析汇总 (from /zones/{zone_id}/analytics/dashboard)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ZoneAnalytics {
    pub requests: AnalyticsCount,
    pub bandwidth: AnalyticsCount,
    pub threats: AnalyticsSimple,
    pub uniques: AnalyticsSimple,
    pub pageviews: AnalyticsSimple,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnalyticsCount {
    #[serde(default)]
    pub all: u64,
    #[serde(default)]
    pub cached: u64,
    #[serde(default)]
    pub uncached: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AnalyticsSimple {
    #[serde(default)]
    pub all: u64,
}

// ======== Zone Setting ========

/// 通用域名设置 (ssl, min_tls_version, always_use_https, brotli, minify, early_hints ...)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ZoneSetting {
    pub id: String,
    pub value: serde_json::Value,
    #[serde(default)]
    pub editable: bool,
    #[serde(default)]
    pub modified_on: Option<String>,
}

// ======== Rulesets (替代已弃用的 Page Rules) ========

/// Cloudflare Ruleset 摘要 (from GET /zones/{zone_id}/rulesets)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RulesetInfo {
    pub id: String,
    #[serde(default)]
    pub name: String,
    #[serde(default)]
    pub phase: String,
    #[serde(default)]
    pub kind: String,
    #[serde(default)]
    pub version: String,
}

/// 规则集中的单条规则
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RulesetRule {
    #[serde(default)]
    pub id: String,
    #[serde(default)]
    pub action: String,
    #[serde(default)]
    pub expression: String,
    #[serde(default)]
    pub description: String,
    #[serde(default)]
    pub enabled: bool,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub action_parameters: Option<serde_json::Value>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub last_updated: Option<String>,
}

/// 前端展示用的扁平化规则（含 ruleset 信息）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FlatRule {
    pub id: String,
    pub ruleset_id: String,
    pub phase: String,
    pub action: String,
    pub expression: String,
    pub description: String,
    pub enabled: bool,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub action_parameters: Option<serde_json::Value>,
}

// ======== Cache Purge Result ========

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PurgeResult {
    pub id: String,
}
