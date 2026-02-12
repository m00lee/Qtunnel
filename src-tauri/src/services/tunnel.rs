use crate::models::{ApiResponse, CfIngressRule, Tunnel, Zone};
use serde::{Deserialize, Serialize};
use tauri::State;

const TUNNEL_CACHE_KEY: &str = "tunnels_list";
const CACHE_TTL: u64 = 300; // 5 min

#[tauri::command]
pub async fn list_tunnels(state: State<'_, crate::AppState>) -> Result<ApiResponse<Vec<Tunnel>>, String> {
    let api = state.cf_api.read().await;
    match api.list_tunnels().await {
        Ok(tunnels) => {
            // 写入缓存（在线时持久化，离线可用）
            if let Ok(val) = serde_json::to_value(&tunnels) {
                state.cache.set(TUNNEL_CACHE_KEY.to_string(), val, CACHE_TTL).await;
            }
            Ok(ApiResponse::ok(tunnels))
        }
        Err(e) => {
            // 网络失败时尝试返回缓存数据
            if e.code() == 1008 || e.code() == 1009 {
                if let Some(cached) = state.cache.get(TUNNEL_CACHE_KEY).await {
                    if let Ok(tunnels) = serde_json::from_value::<Vec<Tunnel>>(cached) {
                        let mut resp = ApiResponse::ok(tunnels);
                        // 附加离线标记（通过 error 字段传递提示）
                        resp.error = Some(crate::models::ApiError {
                            code: 2000, // 特殊码：来自缓存
                            message: format!("离线模式（使用缓存数据）: {}", e),
                        });
                        return Ok(resp);
                    }
                }
            }
            Ok(ApiResponse::err(e.code(), e.to_string()))
        }
    }
}

#[tauri::command]
pub async fn get_tunnel(tunnel_id: String, state: State<'_, crate::AppState>) -> Result<ApiResponse<Tunnel>, String> {
    let api = state.cf_api.read().await;
    match api.get_tunnel(&tunnel_id).await {
        Ok(tunnel) => Ok(ApiResponse::ok(tunnel)),
        Err(e) => Ok(ApiResponse::err(e.code(), e.to_string())),
    }
}

#[tauri::command]
pub async fn create_tunnel(name: String, state: State<'_, crate::AppState>) -> Result<ApiResponse<Tunnel>, String> {
    let api = state.cf_api.read().await;
    match api.create_tunnel(&name).await {
        Ok(tunnel) => Ok(ApiResponse::ok(tunnel)),
        Err(e) => Ok(ApiResponse::err(e.code(), e.to_string())),
    }
}

#[tauri::command]
pub async fn delete_tunnel(tunnel_id: String, state: State<'_, crate::AppState>) -> Result<ApiResponse<()>, String> {
    let api = state.cf_api.read().await;
    match api.delete_tunnel(&tunnel_id).await {
        Ok(_) => Ok(ApiResponse::ok(())),
        Err(e) => Ok(ApiResponse::err(e.code(), e.to_string())),
    }
}

// ======== Zones ========

#[tauri::command]
pub async fn list_zones(state: State<'_, crate::AppState>) -> Result<ApiResponse<Vec<Zone>>, String> {
    let api = state.cf_api.read().await;
    match api.list_zones().await {
        Ok(zones) => Ok(ApiResponse::ok(zones)),
        Err(e) => Ok(ApiResponse::err(e.code(), e.to_string())),
    }
}

// ======== Tunnel Configuration ========

#[tauri::command]
pub async fn get_tunnel_config(tunnel_id: String, state: State<'_, crate::AppState>) -> Result<ApiResponse<Vec<CfIngressRule>>, String> {
    let api = state.cf_api.read().await;
    match api.get_tunnel_config(&tunnel_id).await {
        Ok(result) => {
            // result 是 CF API 返回的 { tunnel_id, config: { ingress: [...] } }
            let ingress = result["config"]["ingress"].as_array()
                .map(|arr| {
                    arr.iter().filter_map(|v| serde_json::from_value::<CfIngressRule>(v.clone()).ok()).collect()
                })
                .unwrap_or_default();
            Ok(ApiResponse::ok(ingress))
        }
        Err(e) => Ok(ApiResponse::err(e.code(), e.to_string())),
    }
}

#[tauri::command]
pub async fn update_tunnel_config(
    tunnel_id: String,
    ingress: Vec<CfIngressRule>,
    state: State<'_, crate::AppState>,
) -> Result<ApiResponse<()>, String> {
    let api = state.cf_api.read().await;
    let config = serde_json::json!({ "ingress": ingress });
    match api.update_tunnel_config(&tunnel_id, &config).await {
        Ok(_) => Ok(ApiResponse::ok(())),
        Err(e) => Ok(ApiResponse::err(e.code(), e.to_string())),
    }
}

// ======== Tunnel Token ========

#[tauri::command]
pub async fn get_tunnel_token(
    tunnel_id: String,
    state: State<'_, crate::AppState>,
) -> Result<ApiResponse<String>, String> {
    let api = state.cf_api.read().await;
    match api.get_tunnel_token(&tunnel_id).await {
        Ok(token) => Ok(ApiResponse::ok(token)),
        Err(e) => Ok(ApiResponse::err(e.code(), e.to_string())),
    }
}

// ======== cloudflared 进程管理 ========

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TunnelRunStatus {
    pub tunnel_id: String,
    pub running: bool,
    pub message: String,
}

/// 检测 cloudflared 是否已安装
#[tauri::command]
pub async fn check_cloudflared() -> Result<ApiResponse<String>, String> {
    match tokio::process::Command::new("cloudflared")
        .arg("--version")
        .output()
        .await
    {
        Ok(output) => {
            let version = String::from_utf8_lossy(&output.stdout).trim().to_string();
            Ok(ApiResponse::ok(version))
        }
        Err(_) => Ok(ApiResponse::err(
            1010,
            "cloudflared 未安装，请先安装: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/".to_string(),
        )),
    }
}

/// 启动 cloudflared tunnel run（后台子进程）
#[tauri::command]
pub async fn run_tunnel(
    tunnel_id: String,
    state: State<'_, crate::AppState>,
) -> Result<ApiResponse<TunnelRunStatus>, String> {
    // 检查是否已在运行（先清理已退出的进程）
    {
        let mut procs = state.tunnel_processes.write().await;
        if let Some(child) = procs.get_mut(&tunnel_id) {
            match child.try_wait() {
                Ok(Some(_exit)) => {
                    // 进程已退出，移除记录
                    procs.remove(&tunnel_id);
                }
                Ok(None) => {
                    // 进程仍在运行
                    return Ok(ApiResponse::ok(TunnelRunStatus {
                        tunnel_id,
                        running: true,
                        message: "隧道已在运行中".to_string(),
                    }));
                }
                Err(_) => {
                    procs.remove(&tunnel_id);
                }
            }
        }
    }

    // 获取 tunnel token
    let token = {
        let api = state.cf_api.read().await;
        match api.get_tunnel_token(&tunnel_id).await {
            Ok(t) => t,
            Err(e) => {
                return Ok(ApiResponse::err(e.code(), format!("获取隧道令牌失败: {}", e)));
            }
        }
    };

    // 读取代理设置，传递给 cloudflared 的环境变量
    let proxy_url = {
        let api = state.cf_api.read().await;
        api.get_proxy_url().map(|s| s.to_string())
    };

    // 启动 cloudflared tunnel run --token <token>
    let mut cmd = tokio::process::Command::new("cloudflared");
    cmd.arg("tunnel")
        .arg("run")
        .arg("--token")
        .arg(&token)
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped());

    // 如果配置了代理，让 cloudflared 也走代理
    if let Some(ref url) = proxy_url {
        cmd.env("HTTPS_PROXY", url);
        cmd.env("HTTP_PROXY", url);
    }

    match cmd.spawn() {
        Ok(child) => {
            let mut procs = state.tunnel_processes.write().await;
            procs.insert(tunnel_id.clone(), child);

            // 等待一小段时间检查进程是否立即退出（token 无效、代理不通等）
            tokio::time::sleep(std::time::Duration::from_millis(1500)).await;
            if let Some(child) = procs.get_mut(&tunnel_id) {
                match child.try_wait() {
                    Ok(Some(exit_status)) => {
                        // 进程已退出 → 启动失败
                        let code = exit_status.code().unwrap_or(-1);
                        procs.remove(&tunnel_id);
                        tracing::warn!("cloudflared exited immediately with code {} for tunnel {}", code, tunnel_id);
                        return Ok(ApiResponse::err(
                            1010,
                            format!("cloudflared 启动后立即退出 (exit code: {})，请检查代理设置或网络连接", code),
                        ));
                    }
                    Ok(None) => {
                        // 仍在运行 → 成功
                        tracing::info!("cloudflared started for tunnel {}", tunnel_id);
                    }
                    Err(e) => {
                        procs.remove(&tunnel_id);
                        return Ok(ApiResponse::err(1010, format!("检查进程状态失败: {}", e)));
                    }
                }
            }

            Ok(ApiResponse::ok(TunnelRunStatus {
                tunnel_id,
                running: true,
                message: "隧道已启动".to_string(),
            }))
        }
        Err(e) => Ok(ApiResponse::err(
            1010,
            format!("启动 cloudflared 失败: {}", e),
        )),
    }
}

/// 停止 cloudflared 子进程
#[tauri::command]
pub async fn stop_tunnel(
    tunnel_id: String,
    state: State<'_, crate::AppState>,
) -> Result<ApiResponse<TunnelRunStatus>, String> {
    let mut procs = state.tunnel_processes.write().await;
    if let Some(mut child) = procs.remove(&tunnel_id) {
        let _ = child.kill().await;
        tracing::info!("cloudflared stopped for tunnel {}", tunnel_id);
        Ok(ApiResponse::ok(TunnelRunStatus {
            tunnel_id,
            running: false,
            message: "隧道已停止".to_string(),
        }))
    } else {
        Ok(ApiResponse::ok(TunnelRunStatus {
            tunnel_id,
            running: false,
            message: "隧道未在运行".to_string(),
        }))
    }
}

/// 查询哪些隧道正在本地运行（自动清理已退出的进程）
#[tauri::command]
pub async fn get_running_tunnels(
    state: State<'_, crate::AppState>,
) -> Result<ApiResponse<Vec<String>>, String> {
    let mut procs = state.tunnel_processes.write().await;
    // 清理已退出的进程
    let mut dead_ids = Vec::new();
    for (id, child) in procs.iter_mut() {
        match child.try_wait() {
            Ok(Some(_)) => dead_ids.push(id.clone()), // 已退出
            Ok(None) => {}                             // 仍在运行
            Err(_) => dead_ids.push(id.clone()),       // 状态异常
        }
    }
    for id in &dead_ids {
        procs.remove(id);
        tracing::info!("Cleaned up exited cloudflared process for tunnel {}", id);
    }
    let ids: Vec<String> = procs.keys().cloned().collect();
    Ok(ApiResponse::ok(ids))
}
