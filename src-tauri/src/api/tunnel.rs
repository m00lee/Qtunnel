use crate::error::AppError;
use crate::models::Tunnel;
use super::client::{CFApi, CF_API_BASE};

impl CFApi {
    pub async fn list_tunnels(&self) -> Result<Vec<Tunnel>, AppError> {
        let url = format!(
            "{}/accounts/{}/cfd_tunnel?is_deleted=false&per_page=100",
            CF_API_BASE, self.account_id
        );
        let body = self.get(&url).await?;
        let tunnels: Vec<Tunnel> = serde_json::from_value(body["result"].clone())
            .map_err(|e| AppError::ApiError(format!("Parse tunnels: {}", e)))?;
        Ok(tunnels)
    }

    pub async fn get_tunnel(&self, tunnel_id: &str) -> Result<Tunnel, AppError> {
        let url = format!(
            "{}/accounts/{}/cfd_tunnel/{}",
            CF_API_BASE, self.account_id, tunnel_id
        );
        let body = self.get(&url).await?;
        let tunnel: Tunnel = serde_json::from_value(body["result"].clone())
            .map_err(|e| AppError::ApiError(format!("Parse tunnel: {}", e)))?;
        Ok(tunnel)
    }

    pub async fn create_tunnel(&self, name: &str) -> Result<Tunnel, AppError> {
        let url = format!(
            "{}/accounts/{}/cfd_tunnel",
            CF_API_BASE, self.account_id
        );
        let secret = super::utils::base64_random_secret();
        let payload = serde_json::json!({
            "name": name,
            "tunnel_secret": secret,
            "config_src": "cloudflare"
        });
        let body = self.post(&url, &payload).await?;
        let tunnel: Tunnel = serde_json::from_value(body["result"].clone())
            .map_err(|e| AppError::ApiError(format!("Parse created tunnel: {}", e)))?;
        Ok(tunnel)
    }

    pub async fn delete_tunnel(&self, tunnel_id: &str) -> Result<(), AppError> {
        // 先清理连接
        let cleanup_url = format!(
            "{}/accounts/{}/cfd_tunnel/{}/connections",
            CF_API_BASE, self.account_id, tunnel_id
        );
        let _ = self.delete_req(&cleanup_url).await;

        let url = format!(
            "{}/accounts/{}/cfd_tunnel/{}",
            CF_API_BASE, self.account_id, tunnel_id
        );
        self.delete_req(&url).await?;
        Ok(())
    }

    /// 获取隧道运行 Token（用于 cloudflared tunnel run --token <TOKEN>）
    pub async fn get_tunnel_token(&self, tunnel_id: &str) -> Result<String, AppError> {
        let url = format!(
            "{}/accounts/{}/cfd_tunnel/{}/token",
            CF_API_BASE, self.account_id, tunnel_id
        );
        let body = self.get(&url).await?;
        body["result"]
            .as_str()
            .map(|s| s.to_string())
            .ok_or_else(|| AppError::ApiError("Token not found in response".to_string()))
    }

    pub async fn get_tunnel_config(&self, tunnel_id: &str) -> Result<serde_json::Value, AppError> {
        let url = format!(
            "{}/accounts/{}/cfd_tunnel/{}/configurations",
            CF_API_BASE, self.account_id, tunnel_id
        );
        let body = self.get(&url).await?;
        Ok(body["result"].clone())
    }

    pub async fn update_tunnel_config(
        &self,
        tunnel_id: &str,
        config: &serde_json::Value,
    ) -> Result<serde_json::Value, AppError> {
        let url = format!(
            "{}/accounts/{}/cfd_tunnel/{}/configurations",
            CF_API_BASE, self.account_id, tunnel_id
        );
        let payload = serde_json::json!({ "config": config });
        let body = self.put(&url, &payload).await?;
        Ok(body["result"].clone())
    }
}
