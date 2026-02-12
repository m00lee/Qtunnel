use crate::models::{ApiResponse, CreateRouteRequest, Route};
use tauri::State;
use uuid::Uuid;

#[tauri::command]
pub async fn add_route(
    req: CreateRouteRequest,
    _state: State<'_, crate::AppState>,
) -> Result<ApiResponse<Route>, String> {
    // TODO: Persist to database
    let route = Route {
        id: Uuid::new_v4().to_string(),
        tunnel_id: req.tunnel_id,
        hostname: req.hostname,
        service: req.service,
        path: req.path,
        priority: req.priority,
    };

    Ok(ApiResponse::ok(route))
}

#[tauri::command]
pub async fn remove_route(
    route_id: String,
    _state: State<'_, crate::AppState>,
) -> Result<ApiResponse<()>, String> {
    // TODO: Remove from database
    let _ = route_id;
    Ok(ApiResponse::ok(()))
}

#[tauri::command]
pub async fn list_routes(
    tunnel_id: String,
    _state: State<'_, crate::AppState>,
) -> Result<ApiResponse<Vec<Route>>, String> {
    // TODO: Query from database
    let _ = tunnel_id;
    Ok(ApiResponse::ok(vec![]))
}
