use crate::error::AppError;
use crate::models::{DnsRecord, Zone};
use super::client::{CFApi, CF_API_BASE};

impl CFApi {
    pub async fn list_zones(&self) -> Result<Vec<Zone>, AppError> {
        let url = format!("{}/zones?per_page=50&status=active", CF_API_BASE);
        let body = self.get(&url).await?;
        let zones: Vec<Zone> = serde_json::from_value(body["result"].clone())
            .map_err(|e| AppError::ApiError(format!("Parse zones: {}", e)))?;
        Ok(zones)
    }

    pub async fn list_dns_records(&self, zone_id: &str) -> Result<Vec<DnsRecord>, AppError> {
        let url = format!(
            "{}/zones/{}/dns_records?per_page=100",
            CF_API_BASE, zone_id
        );
        let body = self.get(&url).await?;
        let records: Vec<DnsRecord> = serde_json::from_value(body["result"].clone())
            .map_err(|e| AppError::ApiError(format!("Parse DNS records: {}", e)))?;
        Ok(records)
    }

    pub async fn create_dns_record(
        &self,
        zone_id: &str,
        name: &str,
        target: &str,
    ) -> Result<DnsRecord, AppError> {
        let url = format!("{}/zones/{}/dns_records", CF_API_BASE, zone_id);
        let payload = serde_json::json!({
            "type": "CNAME",
            "name": name,
            "content": target,
            "ttl": 1,
            "proxied": true
        });
        let body = self.post(&url, &payload).await?;
        let record: DnsRecord = serde_json::from_value(body["result"].clone())
            .map_err(|e| AppError::ApiError(format!("Parse DNS record: {}", e)))?;
        Ok(record)
    }

    pub async fn delete_dns_record(
        &self,
        zone_id: &str,
        record_id: &str,
    ) -> Result<(), AppError> {
        let url = format!(
            "{}/zones/{}/dns_records/{}",
            CF_API_BASE, zone_id, record_id
        );
        self.delete_req(&url).await?;
        Ok(())
    }
}
