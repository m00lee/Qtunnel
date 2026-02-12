use crate::cache::CacheStats;
use crate::models::ApiResponse;
use tauri::State;

#[tauri::command]
pub async fn clear_cache(
    state: State<'_, crate::AppState>,
) -> Result<ApiResponse<()>, String> {
    state.cache.clear().await;
    Ok(ApiResponse::ok(()))
}

#[tauri::command]
pub async fn get_cache_stats(
    state: State<'_, crate::AppState>,
) -> Result<ApiResponse<CacheStats>, String> {
    let stats = state.cache.get_stats().await;
    Ok(ApiResponse::ok(stats))
}
