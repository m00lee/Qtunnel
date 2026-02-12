use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};

/// 配置文件优先级（从高到低）：
///   1. ~/.config/qtunnel/config.json （生产环境，更新后不丢失）
///   2. <app_data_dir>/config.json    （Tauri 应用数据目录）
///   3. .env 文件（源码开发时）
///   4. 全部为空（首次使用，需用户在设置页手动填写）

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Config {
    #[serde(default)]
    pub cf_api_token: String,
    #[serde(default)]
    pub cf_account_id: String,
    #[serde(default = "default_db_path")]
    pub db_path: String,
    #[serde(default = "default_cache_size")]
    pub cache_size: usize,
    #[serde(default = "default_cache_ttl")]
    pub cache_ttl: u64,
    #[serde(default = "default_log_level")]
    pub log_level: String,
    #[serde(default = "default_max_scripts")]
    pub max_scripts: usize,
    #[serde(default = "default_script_memory_mb")]
    pub script_memory_mb: usize,
    #[serde(default = "default_script_timeout_ms")]
    pub script_timeout_ms: u64,
    #[serde(default = "default_script_concurrency")]
    pub script_concurrency: usize,
    /// 代理地址，如 http://127.0.0.1:7890 或 socks5://127.0.0.1:7890
    #[serde(default)]
    pub proxy_url: Option<String>,
    /// 是否跳过代理的 TLS 证书验证（MITM 代理场景）
    #[serde(default)]
    pub proxy_no_verify: bool,
}

fn default_db_path() -> String { "qtunnel.db".to_string() }
fn default_cache_size() -> usize { 1000 }
fn default_cache_ttl() -> u64 { 300 }
fn default_log_level() -> String { "info".to_string() }
fn default_max_scripts() -> usize { 10 }
fn default_script_memory_mb() -> usize { 10 }
fn default_script_timeout_ms() -> u64 { 5000 }
fn default_script_concurrency() -> usize { 3 }

impl Default for Config {
    fn default() -> Self {
        Config {
            cf_api_token: String::new(),
            cf_account_id: String::new(),
            db_path: default_db_path(),
            cache_size: default_cache_size(),
            cache_ttl: default_cache_ttl(),
            log_level: default_log_level(),
            max_scripts: default_max_scripts(),
            script_memory_mb: default_script_memory_mb(),
            script_timeout_ms: default_script_timeout_ms(),
            script_concurrency: default_script_concurrency(),
            proxy_url: None,
            proxy_no_verify: false,
        }
    }
}

impl Config {
    /// 用户级配置目录: ~/.config/qtunnel/
    pub fn user_config_dir() -> PathBuf {
        let home = std::env::var("HOME")
            .or_else(|_| std::env::var("USERPROFILE"))
            .unwrap_or_else(|_| ".".to_string());
        PathBuf::from(home).join(".config").join("qtunnel")
    }

    /// 用户级配置文件路径: ~/.config/qtunnel/config.json
    pub fn user_config_path() -> PathBuf {
        Self::user_config_dir().join("config.json")
    }

    /// 按优先级加载配置：
    ///   1. ~/.config/qtunnel/config.json
    ///   2. app_data_dir/config.json
    ///   3. .env 环境变量
    ///   4. 空默认值
    pub fn load_with_priority(app_data_dir: Option<&Path>) -> Self {
        // 1) 用户级配置
        let user_path = Self::user_config_path();
        if user_path.exists() {
            if let Ok(cfg) = Self::load(&user_path.to_string_lossy()) {
                tracing::info!("Loaded config from {:?}", user_path);
                return cfg;
            }
        }

        // 2) Tauri app data 目录
        if let Some(dir) = app_data_dir {
            let app_path = dir.join("config.json");
            if app_path.exists() {
                if let Ok(cfg) = Self::load(&app_path.to_string_lossy()) {
                    tracing::info!("Loaded config from {:?}", app_path);
                    return cfg;
                }
            }
        }

        // 3) .env 环境变量（开发环境）
        Self::load_from_env().unwrap_or_default()
    }

    /// 从 .env 文件或环境变量中读取配置
    fn load_from_env() -> Option<Self> {
        // 尝试读取项目根目录的 .env 文件
        if let Ok(content) = fs::read_to_string(".env") {
            for line in content.lines() {
                let line = line.trim();
                if line.is_empty() || line.starts_with('#') {
                    continue;
                }
                if let Some((key, value)) = line.split_once('=') {
                    std::env::set_var(key.trim(), value.trim());
                }
            }
        }

        let token = std::env::var("CF_API_TOKEN").unwrap_or_default();
        let account = std::env::var("CF_ACCOUNT_ID").unwrap_or_default();

        if token.is_empty() && account.is_empty() {
            return None;
        }

        Some(Config {
            cf_api_token: token,
            cf_account_id: account,
            db_path: std::env::var("DATABASE_PATH").unwrap_or_else(|_| default_db_path()),
            cache_size: std::env::var("CACHE_SIZE")
                .ok()
                .and_then(|v| v.parse().ok())
                .unwrap_or_else(default_cache_size),
            cache_ttl: std::env::var("CACHE_TTL")
                .ok()
                .and_then(|v| v.parse().ok())
                .unwrap_or_else(default_cache_ttl),
            log_level: std::env::var("LOG_LEVEL").unwrap_or_else(|_| default_log_level()),
            max_scripts: default_max_scripts(),
            script_memory_mb: default_script_memory_mb(),
            script_timeout_ms: default_script_timeout_ms(),
            script_concurrency: default_script_concurrency(),
            proxy_url: std::env::var("HTTPS_PROXY")
                .or_else(|_| std::env::var("HTTP_PROXY"))
                .or_else(|_| std::env::var("ALL_PROXY"))
                .ok(),
            proxy_no_verify: false,
        })
    }

    pub fn load(path: &str) -> Result<Self, Box<dyn std::error::Error>> {
        let content = fs::read_to_string(path)?;
        let config: Config = serde_json::from_str(&content)?;
        Ok(config)
    }

    /// 保存到指定路径（自动创建父目录）
    pub fn save(&self, path: &str) -> Result<(), Box<dyn std::error::Error>> {
        if let Some(parent) = Path::new(path).parent() {
            fs::create_dir_all(parent)?;
        }
        let json = serde_json::to_string_pretty(self)?;
        fs::write(path, json)?;
        Ok(())
    }

    /// 保存到用户配置目录 ~/.config/qtunnel/config.json
    pub fn save_to_user_config(&self) -> Result<(), Box<dyn std::error::Error>> {
        let dir = Self::user_config_dir();
        fs::create_dir_all(&dir)?;
        let path = dir.join("config.json");
        self.save(&path.to_string_lossy())
    }
}
