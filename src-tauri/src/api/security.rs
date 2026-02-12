use crate::error::AppError;
use crate::models::CfAccessRule;
use super::client::{CFApi, CF_API_BASE};

impl CFApi {
    pub async fn list_access_rules(&self, zone_id: &str) -> Result<Vec<CfAccessRule>, AppError> {
        let url = format!(
            "{}/zones/{}/firewall/access_rules/rules?per_page=100",
            CF_API_BASE, zone_id
        );
        let body = self.get(&url).await?;
        let rules: Vec<CfAccessRule> = serde_json::from_value(body["result"].clone())
            .map_err(|e| AppError::ApiError(format!("Parse access rules: {}", e)))?;
        Ok(rules)
    }

    pub async fn create_access_rule(
        &self,
        zone_id: &str,
        mode: &str,
        ip: &str,
        notes: &str,
    ) -> Result<CfAccessRule, AppError> {
        let url = format!(
            "{}/zones/{}/firewall/access_rules/rules",
            CF_API_BASE, zone_id
        );
        let payload = serde_json::json!({
            "mode": mode,
            "configuration": {
                "target": "ip",
                "value": ip
            },
            "notes": notes
        });
        let body = self.post(&url, &payload).await?;
        let rule: CfAccessRule = serde_json::from_value(body["result"].clone())
            .map_err(|e| AppError::ApiError(format!("Parse access rule: {}", e)))?;
        Ok(rule)
    }

    pub async fn delete_access_rule(
        &self,
        zone_id: &str,
        rule_id: &str,
    ) -> Result<(), AppError> {
        let url = format!(
            "{}/zones/{}/firewall/access_rules/rules/{}",
            CF_API_BASE, zone_id, rule_id
        );
        self.delete_req(&url).await?;
        Ok(())
    }
}
