use std::collections::HashMap;
use std::sync::Arc;
use tauri::Manager;
use tokio::sync::{RwLock, Semaphore};

mod api;
mod cache;
mod config;
mod credential;
mod db;
mod error;
mod models;
mod services;

use api::CFApi;
use cache::Cache;
use db::Database;
use services::scripting::ScriptStore;

#[cfg(test)]
mod tests;

/// 管理正在运行的 cloudflared 子进程（tunnel_id → Child）
pub type TunnelProcesses = Arc<RwLock<HashMap<String, tokio::process::Child>>>;

pub struct AppState {
    pub cf_api: Arc<RwLock<CFApi>>,
    pub db: Arc<RwLock<Database>>,
    pub cache: Cache<serde_json::Value>,
    pub script_store: ScriptStore,
    pub script_semaphore: Arc<Semaphore>,
    pub tunnel_processes: TunnelProcesses,
}

fn main() {
    // 初始化日志
    tracing_subscriber::fmt::init();

    tauri::Builder::default()
        .setup(|app| {
            let app_dir = app.path().app_data_dir().expect("Failed to get app data dir");
            std::fs::create_dir_all(&app_dir).ok();

            // 按优先级加载配置: ~/.config/qtunnel/ → app_data → .env → 空
            let cfg = config::Config::load_with_priority(Some(&app_dir));
            tracing::info!("Cache size: {}, TTL: {}s, Log level: {}", cfg.cache_size, cfg.cache_ttl, cfg.log_level);

            let db_path = app_dir.join("qtunnel.db");
            let db_path_str = db_path.to_string_lossy().to_string();

            // 脚本存储
            let script_dir = config::Config::user_config_dir();
            std::fs::create_dir_all(&script_dir).ok();
            let script_store = ScriptStore::new(script_dir.join("scripts.json"));

            // 初始化 API 客户端（同步注入凭据，避免竞态）
            // 优先级: 1) 混淆凭据文件 → 2) 配置文件 → 3) .env
            let mut cf_api = CFApi::with_proxy(cfg.proxy_url.clone(), cfg.proxy_no_verify);
            let creds_from_secure = credential::CredentialStore::load();
            if let Some((token, account)) = creds_from_secure {
                cf_api.set_credentials(token, account);
                tracing::info!("Credentials loaded from secure storage");
            } else if !cfg.cf_api_token.is_empty() && !cfg.cf_account_id.is_empty() {
                cf_api.set_credentials(cfg.cf_api_token.clone(), cfg.cf_account_id.clone());
                tracing::info!("Credentials loaded from config file");
                // 迁移到安全存储
                if credential::CredentialStore::is_available() {
                    if let Err(e) = credential::CredentialStore::store(&cfg.cf_api_token, &cfg.cf_account_id) {
                        tracing::warn!("Failed to migrate credentials to secure storage: {}", e);
                    } else {
                        tracing::info!("Credentials migrated to secure storage");
                    }
                }
            } else {
                tracing::warn!("No credentials found — configure in Settings page or .env file");
            }

            let state = AppState {
                cf_api: Arc::new(RwLock::new(cf_api)),
                db: Arc::new(RwLock::new(Database::new())),
                cache: Cache::new(cfg.cache_size),
                script_store,
                script_semaphore: Arc::new(Semaphore::new(cfg.script_concurrency)),
                tunnel_processes: Arc::new(RwLock::new(HashMap::new())),
            };
            app.manage(state);

            // 异步初始化数据库
            let db_ref = app.state::<AppState>().db.clone();
            tauri::async_runtime::spawn(async move {
                let mut db = db_ref.write().await;
                if let Err(e) = db.init(&db_path_str).await {
                    tracing::error!("Failed to initialize database: {}", e);
                }
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Tunnel
            services::tunnel::list_tunnels,
            services::tunnel::get_tunnel,
            services::tunnel::create_tunnel,
            services::tunnel::delete_tunnel,
            services::tunnel::list_zones,
            services::tunnel::get_tunnel_config,
            services::tunnel::update_tunnel_config,
            services::tunnel::get_tunnel_token,
            services::tunnel::check_cloudflared,
            services::tunnel::run_tunnel,
            services::tunnel::stop_tunnel,
            services::tunnel::get_running_tunnels,
            // Routing (legacy)
            services::routing::add_route,
            services::routing::remove_route,
            services::routing::list_routes,
            // Service binding
            services::local_service::quick_bind,
            services::local_service::unbind_ingress,
            // DNS
            services::dns::list_dns_records,
            services::dns::create_cname,
            services::dns::delete_dns_record,
            // Security
            services::security::list_access_rules,
            services::security::create_access_rule,
            services::security::delete_access_rule,
            // Cache
            services::cache::clear_cache,
            services::cache::get_cache_stats,
            // Config
            services::config::save_settings,
            services::config::load_settings,
            services::config::set_credentials,
            services::config::verify_token,
            // Scripting
            services::scripting::list_scripts,
            services::scripting::create_script,
            services::scripting::update_script,
            services::scripting::delete_script,
            services::scripting::run_script,
            // Zone management
            services::zone::get_zone_analytics,
            services::zone::get_zone_settings,
            services::zone::update_zone_setting,
            services::zone::purge_all_cache,
            services::zone::purge_cache_by_urls,
            services::zone::list_rules,
            services::zone::create_rule,
            services::zone::delete_rule,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
