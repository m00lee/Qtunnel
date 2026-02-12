use crate::error::AppError;
use crate::models::{TokenPermission, TokenVerifyResult};
use super::client::{CFApi, CF_API_BASE};

impl CFApi {
    pub async fn verify_token(&self) -> Result<TokenVerifyResult, AppError> {
        let url = format!("{}/user/tokens/verify", CF_API_BASE);
        let body = self.get(&url).await?;

        let result = &body["result"];
        let id = result["id"].as_str().unwrap_or("").to_string();
        let status = result["status"].as_str().unwrap_or("unknown").to_string();
        let not_before = result["not_before"].as_str().map(String::from);
        let expires_on = result["expires_on"].as_str().map(String::from);

        // 尝试获取 token 详情（权限列表）—— 需要 token ID
        let permissions = if !id.is_empty() {
            self.get_token_permissions(&id).await.unwrap_or_default()
        } else {
            vec![]
        };

        Ok(TokenVerifyResult {
            id,
            status,
            not_before,
            expires_on,
            message: body["messages"]
                .as_array()
                .and_then(|arr| arr.first())
                .and_then(|m| m["message"].as_str())
                .map(String::from),
            permissions,
        })
    }

    async fn get_token_permissions(&self, token_id: &str) -> Result<Vec<TokenPermission>, AppError> {
        let url = format!("{}/user/tokens/{}", CF_API_BASE, token_id);
        let body = self.get(&url).await?;
        let policies = body["result"]["policies"].as_array();

        let mut permissions = Vec::new();
        if let Some(policies) = policies {
            for policy in policies {
                let effect = policy["effect"].as_str().unwrap_or("allow").to_string();

                let resources: Vec<String> = policy["resources"]
                    .as_object()
                    .map(|m| m.keys().cloned().collect())
                    .unwrap_or_default();

                let permission_groups: Vec<String> = policy["permission_groups"]
                    .as_array()
                    .map(|arr| {
                        arr.iter()
                            .filter_map(|g| g["name"].as_str().map(String::from))
                            .collect()
                    })
                    .unwrap_or_default();

                permissions.push(TokenPermission {
                    effect,
                    resources,
                    permission_groups,
                });
            }
        }
        Ok(permissions)
    }

    /// 检查 token 是否具有指定的权限组名称
    pub fn check_permission(permissions: &[TokenPermission], group_name: &str) -> bool {
        permissions.iter().any(|p| {
            p.effect == "allow"
                && p.permission_groups.iter().any(|g| {
                    g.to_lowercase().contains(&group_name.to_lowercase())
                })
        })
    }
}
