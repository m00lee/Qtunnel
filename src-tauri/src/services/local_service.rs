use crate::models::{ApiResponse, CfIngressRule, QuickBindResult};
use tauri::State;

/// 一键绑定：添加 ingress rule 到隧道配置 + 创建 CNAME DNS 记录
#[tauri::command]
pub async fn quick_bind(
    tunnel_id: String,
    zone_id: String,
    zone_name: String,
    subdomain: String,
    protocol: String,
    local_port: u16,
    state: State<'_, crate::AppState>,
) -> Result<ApiResponse<QuickBindResult>, String> {
    let api = state.cf_api.read().await;

    let hostname = if subdomain.is_empty() {
        zone_name.clone()
    } else {
        format!("{}.{}", subdomain, zone_name)
    };
    let service_url = format!("{}://localhost:{}", protocol, local_port);

    // 1. 读取当前隧道配置
    let config_result = match api.get_tunnel_config(&tunnel_id).await {
        Ok(v) => v,
        Err(e) => return Ok(ApiResponse::err(e.code(), e.to_string())),
    };

    let mut ingress: Vec<CfIngressRule> = config_result["config"]["ingress"]
        .as_array()
        .map(|arr| arr.iter().filter_map(|v| serde_json::from_value(v.clone()).ok()).collect())
        .unwrap_or_default();

    // 检查是否已存在相同 hostname
    if ingress.iter().any(|r| r.hostname.as_deref() == Some(&hostname)) {
        return Ok(ApiResponse::err(1020, format!("Hostname {} already exists in tunnel config", hostname)));
    }

    // 2. 在 catch-all 规则之前插入新规则
    let new_rule = CfIngressRule {
        hostname: Some(hostname.clone()),
        service: service_url.clone(),
        path: None,
        origin_request: None,
    };

    // catch-all 规则 (hostname == None) 始终在最后
    if let Some(pos) = ingress.iter().position(|r| r.hostname.is_none()) {
        ingress.insert(pos, new_rule);
    } else {
        // 如果没有 catch-all，添加规则后追加一个默认 catch-all
        ingress.push(new_rule);
        ingress.push(CfIngressRule {
            hostname: None,
            service: "http_status:404".to_string(),
            path: None,
            origin_request: None,
        });
    }

    // 3. 更新隧道配置
    let config = serde_json::json!({ "ingress": ingress });
    if let Err(e) = api.update_tunnel_config(&tunnel_id, &config).await {
        return Ok(ApiResponse::err(e.code(), format!("Failed to update tunnel config: {}", e)));
    }

    // 4. 创建 CNAME DNS 记录指向 tunnel
    let cname_target = format!("{}.cfargotunnel.com", tunnel_id);
    let dns_record_id = match api.create_dns_record(&zone_id, &hostname, &cname_target).await {
        Ok(record) => record.id,
        Err(e) => {
            // DNS 创建失败，但 ingress 已更新，返回警告
            return Ok(ApiResponse::ok(QuickBindResult {
                hostname: hostname.clone(),
                service: service_url,
                dns_record_id: format!("DNS_ERROR: {}", e),
                tunnel_id,
            }));
        }
    };

    Ok(ApiResponse::ok(QuickBindResult {
        hostname,
        service: service_url,
        dns_record_id,
        tunnel_id,
    }))
}

/// 解绑：从隧道 ingress 中移除指定 hostname 的规则
#[tauri::command]
pub async fn unbind_ingress(
    tunnel_id: String,
    hostname: String,
    state: State<'_, crate::AppState>,
) -> Result<ApiResponse<()>, String> {
    let api = state.cf_api.read().await;

    // 读取当前配置
    let config_result = match api.get_tunnel_config(&tunnel_id).await {
        Ok(v) => v,
        Err(e) => return Ok(ApiResponse::err(e.code(), e.to_string())),
    };

    let mut ingress: Vec<CfIngressRule> = config_result["config"]["ingress"]
        .as_array()
        .map(|arr| arr.iter().filter_map(|v| serde_json::from_value(v.clone()).ok()).collect())
        .unwrap_or_default();

    let original_len = ingress.len();
    ingress.retain(|r| r.hostname.as_deref() != Some(&hostname));

    if ingress.len() == original_len {
        return Ok(ApiResponse::err(1021, format!("Hostname {} not found in tunnel config", hostname)));
    }

    // 确保至少有 catch-all 规则
    if ingress.is_empty() || ingress.last().map_or(true, |r| r.hostname.is_some()) {
        ingress.push(CfIngressRule {
            hostname: None,
            service: "http_status:404".to_string(),
            path: None,
            origin_request: None,
        });
    }

    let config = serde_json::json!({ "ingress": ingress });
    match api.update_tunnel_config(&tunnel_id, &config).await {
        Ok(_) => Ok(ApiResponse::ok(())),
        Err(e) => Ok(ApiResponse::err(e.code(), e.to_string())),
    }
}
