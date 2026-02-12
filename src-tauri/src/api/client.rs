use reqwest::Client;
use serde_json::Value;

use crate::error::AppError;

pub const CF_API_BASE: &str = "https://api.cloudflare.com/client/v4";

pub struct CFApi {
    pub(crate) client: Client,
    pub(crate) api_token: String,
    pub(crate) account_id: String,
    proxy_url: Option<String>,
    proxy_no_verify: bool,
}

impl CFApi {
    pub fn new() -> Self {
        CFApi {
            client: Self::build_client(None, false),
            api_token: String::new(),
            account_id: String::new(),
            proxy_url: None,
            proxy_no_verify: false,
        }
    }

    /// 创建并配置代理的 CFApi
    pub fn with_proxy(proxy_url: Option<String>, proxy_no_verify: bool) -> Self {
        CFApi {
            client: Self::build_client(proxy_url.as_deref(), proxy_no_verify),
            api_token: String::new(),
            account_id: String::new(),
            proxy_url,
            proxy_no_verify,
        }
    }

    /// 运行时更新代理设置，会重建 HTTP Client
    pub fn set_proxy(&mut self, proxy_url: Option<String>, proxy_no_verify: bool) {
        self.proxy_url = proxy_url.clone();
        self.proxy_no_verify = proxy_no_verify;
        self.client = Self::build_client(proxy_url.as_deref(), proxy_no_verify);
    }

    pub fn get_proxy_url(&self) -> Option<&str> {
        self.proxy_url.as_deref()
    }

    fn build_client(proxy_url: Option<&str>, no_verify: bool) -> Client {
        let mut builder = Client::builder()
            .timeout(std::time::Duration::from_secs(15))
            .connect_timeout(std::time::Duration::from_secs(10));

        // 显式配置代理
        if let Some(url) = proxy_url {
            if !url.is_empty() {
                match reqwest::Proxy::all(url) {
                    Ok(proxy) => {
                        builder = builder.proxy(proxy);
                        tracing::info!("HTTP client using proxy: {}", url);
                    }
                    Err(e) => {
                        tracing::warn!("Invalid proxy URL '{}': {}", url, e);
                    }
                }
            }
        }

        // MITM 代理场景：跳过 TLS 证书验证
        if no_verify {
            builder = builder.danger_accept_invalid_certs(true);
            tracing::warn!("TLS certificate verification DISABLED (proxy mode)");
        }

        builder.build().unwrap_or_else(|_| Client::new())
    }

    pub fn set_credentials(&mut self, token: String, account_id: String) {
        self.api_token = token;
        self.account_id = account_id;
    }

    pub fn has_credentials(&self) -> bool {
        !self.api_token.is_empty() && !self.account_id.is_empty()
    }

    pub fn get_token(&self) -> &str {
        &self.api_token
    }

    pub fn get_account_id(&self) -> &str {
        &self.account_id
    }

    // ── HTTP 请求基础方法 ─────────────────────────────

    pub(crate) fn auth_header(&self) -> Result<String, AppError> {
        if self.api_token.is_empty() {
            return Err(AppError::Unauthorized);
        }
        Ok(format!("Bearer {}", self.api_token))
    }

    pub(crate) async fn get(&self, url: &str) -> Result<Value, AppError> {
        let resp = self
            .client
            .get(url)
            .header("Authorization", self.auth_header()?)
            .header("Content-Type", "application/json")
            .send()
            .await
            .map_err(Self::map_network_error)?;

        Self::handle_response(resp).await
    }

    pub(crate) async fn post(&self, url: &str, payload: &Value) -> Result<Value, AppError> {
        let resp = self
            .client
            .post(url)
            .header("Authorization", self.auth_header()?)
            .header("Content-Type", "application/json")
            .json(payload)
            .send()
            .await
            .map_err(Self::map_network_error)?;

        Self::handle_response(resp).await
    }

    pub(crate) async fn put(&self, url: &str, payload: &Value) -> Result<Value, AppError> {
        let resp = self
            .client
            .put(url)
            .header("Authorization", self.auth_header()?)
            .header("Content-Type", "application/json")
            .json(payload)
            .send()
            .await
            .map_err(Self::map_network_error)?;

        Self::handle_response(resp).await
    }

    pub(crate) async fn delete_req(&self, url: &str) -> Result<Value, AppError> {
        let resp = self
            .client
            .delete(url)
            .header("Authorization", self.auth_header()?)
            .header("Content-Type", "application/json")
            .send()
            .await
            .map_err(Self::map_network_error)?;

        Self::handle_response(resp).await
    }

    pub(crate) async fn patch(&self, url: &str, payload: &Value) -> Result<Value, AppError> {
        let resp = self
            .client
            .patch(url)
            .header("Authorization", self.auth_header()?)
            .header("Content-Type", "application/json")
            .json(payload)
            .send()
            .await
            .map_err(Self::map_network_error)?;

        Self::handle_response(resp).await
    }

    // ── 内部辅助 ─────────────────────────────────────

    async fn handle_response(resp: reqwest::Response) -> Result<Value, AppError> {
        let status = resp.status();
        let body: Value = resp
            .json()
            .await
            .map_err(|e| AppError::ApiError(format!("Failed to parse response: {}", e)))?;

        if !status.is_success() {
            let msg = Self::extract_error(&body);
            return Err(AppError::ApiError(format!("HTTP {}: {}", status, msg)));
        }
        Ok(body)
    }

    pub(crate) fn map_network_error(e: reqwest::Error) -> AppError {
        if e.is_timeout() {
            AppError::NetworkError("请求超时，请检查网络连接或尝试使用代理".to_string())
        } else if e.is_connect() {
            AppError::NetworkError("无法连接到 Cloudflare API，请检查网络".to_string())
        } else {
            AppError::NetworkError(e.to_string())
        }
    }

    pub(crate) fn extract_error(body: &Value) -> String {
        body["errors"]
            .as_array()
            .and_then(|arr| arr.first())
            .and_then(|e| e["message"].as_str())
            .unwrap_or("Unknown error")
            .to_string()
    }
}
