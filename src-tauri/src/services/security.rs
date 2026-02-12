use crate::models::{ApiResponse, CfAccessRule};
use tauri::State;

// ======== IP Access Rules（真实 CF API）========

#[tauri::command]
pub async fn list_access_rules(
    zone_id: String,
    state: State<'_, crate::AppState>,
) -> Result<ApiResponse<Vec<CfAccessRule>>, String> {
    let api = state.cf_api.read().await;
    match api.list_access_rules(&zone_id).await {
        Ok(rules) => Ok(ApiResponse::ok(rules)),
        Err(e) => Ok(ApiResponse::err(e.code(), e.to_string())),
    }
}

#[tauri::command]
pub async fn create_access_rule(
    zone_id: String,
    mode: String,
    ip: String,
    notes: String,
    state: State<'_, crate::AppState>,
) -> Result<ApiResponse<CfAccessRule>, String> {
    let api = state.cf_api.read().await;
    match api.create_access_rule(&zone_id, &mode, &ip, &notes).await {
        Ok(rule) => Ok(ApiResponse::ok(rule)),
        Err(e) => Ok(ApiResponse::err(e.code(), e.to_string())),
    }
}

#[tauri::command]
pub async fn delete_access_rule(
    zone_id: String,
    rule_id: String,
    state: State<'_, crate::AppState>,
) -> Result<ApiResponse<()>, String> {
    let api = state.cf_api.read().await;
    match api.delete_access_rule(&zone_id, &rule_id).await {
        Ok(_) => Ok(ApiResponse::ok(())),
        Err(e) => Ok(ApiResponse::err(e.code(), e.to_string())),
    }
}
