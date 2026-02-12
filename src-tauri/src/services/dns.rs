use crate::models::{ApiResponse, DnsRecord};
use tauri::State;

#[tauri::command]
pub async fn list_dns_records(
    zone_id: String,
    state: State<'_, crate::AppState>,
) -> Result<ApiResponse<Vec<DnsRecord>>, String> {
    let api = state.cf_api.read().await;
    match api.list_dns_records(&zone_id).await {
        Ok(records) => Ok(ApiResponse::ok(records)),
        Err(e) => Ok(ApiResponse::err(e.code(), e.to_string())),
    }
}

#[tauri::command]
pub async fn create_cname(
    zone_id: String,
    name: String,
    target: String,
    state: State<'_, crate::AppState>,
) -> Result<ApiResponse<DnsRecord>, String> {
    let api = state.cf_api.read().await;
    match api.create_dns_record(&zone_id, &name, &target).await {
        Ok(record) => Ok(ApiResponse::ok(record)),
        Err(e) => Ok(ApiResponse::err(e.code(), e.to_string())),
    }
}

#[tauri::command]
pub async fn delete_dns_record(
    zone_id: String,
    record_id: String,
    state: State<'_, crate::AppState>,
) -> Result<ApiResponse<()>, String> {
    let api = state.cf_api.read().await;
    match api.delete_dns_record(&zone_id, &record_id).await {
        Ok(_) => Ok(ApiResponse::ok(())),
        Err(e) => Ok(ApiResponse::err(e.code(), e.to_string())),
    }
}
