use crate::models::{ApiResponse, FlatRule, PurgeResult, ZoneAnalytics, ZoneSetting};
use tauri::State;

// ── Zone Analytics ─────────────────────────────────

#[tauri::command]
pub async fn get_zone_analytics(
    zone_id: String,
    since_minutes: Option<i64>,
    state: State<'_, crate::AppState>,
) -> Result<ApiResponse<ZoneAnalytics>, String> {
    let api = state.cf_api.read().await;
    let minutes = since_minutes.unwrap_or(1440); // 默认 24 小时
    match api.get_zone_analytics(&zone_id, minutes).await {
        Ok(analytics) => Ok(ApiResponse::ok(analytics)),
        Err(e) => Ok(ApiResponse::err(e.code(), e.to_string())),
    }
}

// ── Zone Settings ──────────────────────────────────

#[tauri::command]
pub async fn get_zone_settings(
    zone_id: String,
    state: State<'_, crate::AppState>,
) -> Result<ApiResponse<Vec<ZoneSetting>>, String> {
    let api = state.cf_api.read().await;
    let setting_ids = &[
        "ssl",
        "min_tls_version",
        "always_use_https",
        "brotli",
        "minify",
        "early_hints",
        "browser_cache_ttl",
        "security_level",
        "automatic_https_rewrites",
    ];
    match api.get_zone_settings(&zone_id, setting_ids).await {
        Ok(settings) => Ok(ApiResponse::ok(settings)),
        Err(e) => Ok(ApiResponse::err(e.code(), e.to_string())),
    }
}

#[tauri::command]
pub async fn update_zone_setting(
    zone_id: String,
    setting_id: String,
    value: serde_json::Value,
    state: State<'_, crate::AppState>,
) -> Result<ApiResponse<ZoneSetting>, String> {
    let api = state.cf_api.read().await;
    match api.update_zone_setting(&zone_id, &setting_id, &value).await {
        Ok(setting) => Ok(ApiResponse::ok(setting)),
        Err(e) => Ok(ApiResponse::err(e.code(), e.to_string())),
    }
}

// ── Cache Purge ────────────────────────────────────

#[tauri::command]
pub async fn purge_all_cache(
    zone_id: String,
    state: State<'_, crate::AppState>,
) -> Result<ApiResponse<PurgeResult>, String> {
    let api = state.cf_api.read().await;
    match api.purge_all_cache(&zone_id).await {
        Ok(result) => Ok(ApiResponse::ok(result)),
        Err(e) => Ok(ApiResponse::err(e.code(), e.to_string())),
    }
}

#[tauri::command]
pub async fn purge_cache_by_urls(
    zone_id: String,
    urls: Vec<String>,
    state: State<'_, crate::AppState>,
) -> Result<ApiResponse<PurgeResult>, String> {
    let api = state.cf_api.read().await;
    match api.purge_cache_by_urls(&zone_id, &urls).await {
        Ok(result) => Ok(ApiResponse::ok(result)),
        Err(e) => Ok(ApiResponse::err(e.code(), e.to_string())),
    }
}

// ── Rulesets ───────────────────────────────────────

#[tauri::command]
pub async fn list_rules(
    zone_id: String,
    state: State<'_, crate::AppState>,
) -> Result<ApiResponse<Vec<FlatRule>>, String> {
    let api = state.cf_api.read().await;
    match api.list_all_rules(&zone_id).await {
        Ok(rules) => Ok(ApiResponse::ok(rules)),
        Err(e) => Ok(ApiResponse::err(e.code(), e.to_string())),
    }
}

#[tauri::command]
pub async fn create_rule(
    zone_id: String,
    phase: String,
    expression: String,
    action: String,
    action_parameters: serde_json::Value,
    description: String,
    state: State<'_, crate::AppState>,
) -> Result<ApiResponse<FlatRule>, String> {
    let api = state.cf_api.read().await;
    match api.create_rule(&zone_id, &phase, &expression, &action, &action_parameters, &description).await {
        Ok(rule) => Ok(ApiResponse::ok(rule)),
        Err(e) => Ok(ApiResponse::err(e.code(), e.to_string())),
    }
}

#[tauri::command]
pub async fn delete_rule(
    zone_id: String,
    ruleset_id: String,
    rule_id: String,
    state: State<'_, crate::AppState>,
) -> Result<ApiResponse<()>, String> {
    let api = state.cf_api.read().await;
    match api.delete_rule(&zone_id, &ruleset_id, &rule_id).await {
        Ok(_) => Ok(ApiResponse::ok(())),
        Err(e) => Ok(ApiResponse::err(e.code(), e.to_string())),
    }
}
