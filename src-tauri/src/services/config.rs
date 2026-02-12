use crate::config::Config;
use crate::credential::CredentialStore;
use crate::models::{ApiResponse, TokenVerifyResult};
use tauri::State;

#[allow(clippy::too_many_arguments)]
#[tauri::command]
pub async fn save_settings(
    api_token: String,
    account_id: String,
    cache_size: Option<usize>,
    cache_ttl: Option<u64>,
    log_level: Option<String>,
    proxy_url: Option<String>,
    proxy_no_verify: Option<bool>,
    state: State<'_, crate::AppState>,
) -> Result<ApiResponse<()>, String> {
    let clean_proxy = proxy_url
        .as_deref()
        .filter(|s| !s.trim().is_empty())
        .map(|s| s.trim().to_string());
    let no_verify = proxy_no_verify.unwrap_or(false);

    let cfg = Config {
        cf_api_token: api_token.clone(),
        cf_account_id: account_id.clone(),
        cache_size: cache_size.unwrap_or(1000),
        cache_ttl: cache_ttl.unwrap_or(300),
        log_level: log_level.unwrap_or_else(|| "info".to_string()),
        proxy_url: clean_proxy.clone(),
        proxy_no_verify: no_verify,
        ..Config::default()
    };

    // 同步更新运行时凭据 + 代理，使保存后无需重启即可生效
    {
        let mut api = state.cf_api.write().await;
        api.set_credentials(api_token.clone(), account_id.clone());
        api.set_proxy(clean_proxy, no_verify);
    }

    // 优先存入系统密钥环
    if CredentialStore::is_available() {
        if let Err(e) = CredentialStore::store(&api_token, &account_id) {
            tracing::warn!("Keyring store failed, falling back to config file: {}", e);
        } else {
            tracing::info!("Credentials saved to system keyring");
        }
    }

    // 保存到 ~/.config/qtunnel/config.json（生产环境持久化，更新不影响）
    match cfg.save_to_user_config() {
        Ok(_) => {
            tracing::info!("Settings saved to {:?}", Config::user_config_path());
            Ok(ApiResponse::ok(()))
        }
        Err(e) => Ok(ApiResponse::err(1007, format!("Failed to save settings: {}", e))),
    }
}

#[tauri::command]
pub async fn load_settings(
    _state: State<'_, crate::AppState>,
) -> Result<ApiResponse<Config>, String> {
    let cfg = Config::load_with_priority(None);
    Ok(ApiResponse::ok(cfg))
}

#[tauri::command]
pub async fn set_credentials(
    api_token: String,
    account_id: String,
    state: State<'_, crate::AppState>,
) -> Result<ApiResponse<()>, String> {
    let mut api = state.cf_api.write().await;
    api.set_credentials(api_token, account_id);
    Ok(ApiResponse::ok(()))
}

#[tauri::command]
pub async fn verify_token(
    state: State<'_, crate::AppState>,
) -> Result<ApiResponse<TokenVerifyResult>, String> {
    let api = state.cf_api.read().await;
    match api.verify_token().await {
        Ok(result) => Ok(ApiResponse::ok(result)),
        Err(e) => Ok(ApiResponse::err(e.code(), e.to_string())),
    }
}
