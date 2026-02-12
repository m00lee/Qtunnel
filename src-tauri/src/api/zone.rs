use crate::error::AppError;
use crate::models::{AnalyticsCount, AnalyticsSimple, FlatRule, PurgeResult, RulesetInfo, RulesetRule, ZoneAnalytics, ZoneSetting};
use super::client::{CFApi, CF_API_BASE};

impl CFApi {
    // ── Zone Analytics (GraphQL) ──────────────────────

    /// 获取域名流量分析 (最近 since_minutes 分钟)，使用 GraphQL API
    pub async fn get_zone_analytics(
        &self,
        zone_id: &str,
        since_minutes: i64,
    ) -> Result<ZoneAnalytics, AppError> {
        let now = chrono::Utc::now();
        let since = now - chrono::Duration::minutes(since_minutes);

        // < 24h 用 httpRequests1hGroups (datetime filter)
        // >= 24h 用 httpRequests1dGroups (date filter)
        let (query, variables) = if since_minutes < 1440 {
            let q = r#"
                query($zoneTag: string!, $since: Time!, $until: Time!) {
                    viewer {
                        zones(filter: { zoneTag: $zoneTag }) {
                            httpRequests1hGroups(limit: 100, filter: { datetime_geq: $since, datetime_leq: $until }) {
                                sum { requests cachedRequests bytes cachedBytes threats pageViews }
                                uniq { uniques }
                            }
                        }
                    }
                }
            "#;
            let vars = serde_json::json!({
                "zoneTag": zone_id,
                "since": since.format("%Y-%m-%dT%H:%M:%SZ").to_string(),
                "until": now.format("%Y-%m-%dT%H:%M:%SZ").to_string(),
            });
            (q, vars)
        } else {
            let q = r#"
                query($zoneTag: string!, $since: Date!, $until: Date!) {
                    viewer {
                        zones(filter: { zoneTag: $zoneTag }) {
                            httpRequests1dGroups(limit: 100, filter: { date_geq: $since, date_leq: $until }) {
                                sum { requests cachedRequests bytes cachedBytes threats pageViews }
                                uniq { uniques }
                            }
                        }
                    }
                }
            "#;
            let vars = serde_json::json!({
                "zoneTag": zone_id,
                "since": since.format("%Y-%m-%d").to_string(),
                "until": now.format("%Y-%m-%d").to_string(),
            });
            (q, vars)
        };

        let gql_url = format!("{}/graphql", CF_API_BASE);
        let payload = serde_json::json!({ "query": query, "variables": variables });
        let body = self.post(&gql_url, &payload).await?;

        // 检查 GraphQL 错误
        if let Some(errors) = body["errors"].as_array() {
            if let Some(first) = errors.first() {
                let msg = first["message"].as_str().unwrap_or("GraphQL error");
                return Err(AppError::ApiError(msg.to_string()));
            }
        }

        // 解析分组数据并聚合
        let zones = &body["data"]["viewer"]["zones"];
        let zone_arr = zones.as_array().ok_or_else(|| AppError::ApiError("No zone data".into()))?;
        if zone_arr.is_empty() {
            return Err(AppError::ApiError("Zone not found in analytics".into()));
        }

        let groups_key = if since_minutes < 1440 { "httpRequests1hGroups" } else { "httpRequests1dGroups" };
        let groups = zone_arr[0][groups_key].as_array();

        let mut total_requests: u64 = 0;
        let mut cached_requests: u64 = 0;
        let mut total_bytes: u64 = 0;
        let mut cached_bytes: u64 = 0;
        let mut total_threats: u64 = 0;
        let mut total_pageviews: u64 = 0;
        let mut total_uniques: u64 = 0;

        if let Some(groups) = groups {
            for g in groups {
                let sum = &g["sum"];
                total_requests += sum["requests"].as_u64().unwrap_or(0);
                cached_requests += sum["cachedRequests"].as_u64().unwrap_or(0);
                total_bytes += sum["bytes"].as_u64().unwrap_or(0);
                cached_bytes += sum["cachedBytes"].as_u64().unwrap_or(0);
                total_threats += sum["threats"].as_u64().unwrap_or(0);
                total_pageviews += sum["pageViews"].as_u64().unwrap_or(0);
                total_uniques += g["uniq"]["uniques"].as_u64().unwrap_or(0);
            }
        }

        Ok(ZoneAnalytics {
            requests: AnalyticsCount {
                all: total_requests,
                cached: cached_requests,
                uncached: total_requests.saturating_sub(cached_requests),
            },
            bandwidth: AnalyticsCount {
                all: total_bytes,
                cached: cached_bytes,
                uncached: total_bytes.saturating_sub(cached_bytes),
            },
            threats: AnalyticsSimple { all: total_threats },
            uniques: AnalyticsSimple { all: total_uniques },
            pageviews: AnalyticsSimple { all: total_pageviews },
        })
    }

    // ── Zone Settings ─────────────────────────────────

    /// 批量获取多个域名设置
    pub async fn get_zone_settings(
        &self,
        zone_id: &str,
        setting_ids: &[&str],
    ) -> Result<Vec<ZoneSetting>, AppError> {
        let url = format!("{}/zones/{}/settings", CF_API_BASE, zone_id);
        let body = self.get(&url).await?;
        let all: Vec<ZoneSetting> = serde_json::from_value(body["result"].clone())
            .map_err(|e| AppError::ApiError(format!("Parse zone settings: {}", e)))?;
        let filtered: Vec<ZoneSetting> = all
            .into_iter()
            .filter(|s| setting_ids.contains(&s.id.as_str()))
            .collect();
        Ok(filtered)
    }

    /// 更新单个域名设置
    pub async fn update_zone_setting(
        &self,
        zone_id: &str,
        setting_id: &str,
        value: &serde_json::Value,
    ) -> Result<ZoneSetting, AppError> {
        let url = format!(
            "{}/zones/{}/settings/{}",
            CF_API_BASE, zone_id, setting_id
        );
        let payload = serde_json::json!({ "value": value });
        let body = self.patch(&url, &payload).await?;
        let setting: ZoneSetting = serde_json::from_value(body["result"].clone())
            .map_err(|e| AppError::ApiError(format!("Parse zone setting: {}", e)))?;
        Ok(setting)
    }

    // ── Cache Purge ───────────────────────────────────

    /// 清除全部缓存
    pub async fn purge_all_cache(&self, zone_id: &str) -> Result<PurgeResult, AppError> {
        let url = format!("{}/zones/{}/purge_cache", CF_API_BASE, zone_id);
        let payload = serde_json::json!({ "purge_everything": true });
        let body = self.post(&url, &payload).await?;
        let result: PurgeResult = serde_json::from_value(body["result"].clone())
            .map_err(|e| AppError::ApiError(format!("Parse purge result: {}", e)))?;
        Ok(result)
    }

    /// 按 URL 清除缓存
    pub async fn purge_cache_by_urls(
        &self,
        zone_id: &str,
        urls: &[String],
    ) -> Result<PurgeResult, AppError> {
        let url = format!("{}/zones/{}/purge_cache", CF_API_BASE, zone_id);
        let payload = serde_json::json!({ "files": urls });
        let body = self.post(&url, &payload).await?;
        let result: PurgeResult = serde_json::from_value(body["result"].clone())
            .map_err(|e| AppError::ApiError(format!("Parse purge result: {}", e)))?;
        Ok(result)
    }

    // ── Rulesets (替代 Page Rules) ──────────────────────

    /// 列出 zone 所有 rulesets
    async fn list_rulesets(&self, zone_id: &str) -> Result<Vec<RulesetInfo>, AppError> {
        let url = format!("{}/zones/{}/rulesets", CF_API_BASE, zone_id);
        let body = self.get(&url).await?;
        let rulesets: Vec<RulesetInfo> = serde_json::from_value(body["result"].clone())
            .map_err(|e| AppError::ApiError(format!("Parse rulesets: {}", e)))?;
        Ok(rulesets)
    }

    /// 获取单个 ruleset 的所有规则
    async fn get_ruleset_rules(&self, zone_id: &str, ruleset_id: &str) -> Result<Vec<RulesetRule>, AppError> {
        let url = format!("{}/zones/{}/rulesets/{}", CF_API_BASE, zone_id, ruleset_id);
        let body = self.get(&url).await?;
        let rules: Vec<RulesetRule> = serde_json::from_value(body["result"]["rules"].clone())
            .unwrap_or_default();
        Ok(rules)
    }

    /// 列出所有用户可见的规则（扁平化）
    pub async fn list_all_rules(&self, zone_id: &str) -> Result<Vec<FlatRule>, AppError> {
        let rulesets = self.list_rulesets(zone_id).await?;

        // 只展示用户关心的 phase
        let phases = [
            "http_request_dynamic_redirect",
            "http_request_cache_settings",
            "http_config_settings",
            "http_request_late_transform",
            "http_request_transform",
            "http_response_headers_transform",
        ];

        let mut flat_rules = Vec::new();
        for rs in &rulesets {
            if rs.kind != "zone" || !phases.contains(&rs.phase.as_str()) {
                continue;
            }
            if let Ok(rules) = self.get_ruleset_rules(zone_id, &rs.id).await {
                for r in rules {
                    flat_rules.push(FlatRule {
                        id: r.id,
                        ruleset_id: rs.id.clone(),
                        phase: rs.phase.clone(),
                        action: r.action,
                        expression: r.expression,
                        description: r.description,
                        enabled: r.enabled,
                        action_parameters: r.action_parameters,
                    });
                }
            }
        }
        Ok(flat_rules)
    }

    /// 创建规则（如果 phase 对应的 ruleset 不存在则自动创建）
    pub async fn create_rule(
        &self,
        zone_id: &str,
        phase: &str,
        expression: &str,
        action: &str,
        action_parameters: &serde_json::Value,
        description: &str,
    ) -> Result<FlatRule, AppError> {
        // 查找已有 ruleset
        let rulesets = self.list_rulesets(zone_id).await?;
        let existing = rulesets.iter().find(|r| r.phase == phase && r.kind == "zone");

        let rule_payload = serde_json::json!({
            "action": action,
            "expression": expression,
            "action_parameters": action_parameters,
            "description": description,
            "enabled": true
        });

        if let Some(rs) = existing {
            // 追加规则
            let url = format!("{}/zones/{}/rulesets/{}/rules", CF_API_BASE, zone_id, rs.id);
            let body = self.post(&url, &rule_payload).await?;
            // 返回最后一条规则
            let rules = body["result"]["rules"].as_array();
            let last = rules
                .and_then(|arr| arr.last())
                .ok_or_else(|| AppError::ApiError("No rule returned".into()))?;
            let created: RulesetRule = serde_json::from_value(last.clone())
                .map_err(|e| AppError::ApiError(format!("Parse rule: {}", e)))?;
            Ok(FlatRule {
                id: created.id,
                ruleset_id: rs.id.clone(),
                phase: phase.to_string(),
                action: created.action,
                expression: created.expression,
                description: created.description,
                enabled: created.enabled,
                action_parameters: created.action_parameters,
            })
        } else {
            // 创建新的 ruleset
            let url = format!("{}/zones/{}/rulesets", CF_API_BASE, zone_id);
            let payload = serde_json::json!({
                "name": format!("QTunnel {}", phase),
                "kind": "zone",
                "phase": phase,
                "rules": [rule_payload]
            });
            let body = self.post(&url, &payload).await?;
            let rs_id = body["result"]["id"].as_str().unwrap_or("").to_string();
            let rules = body["result"]["rules"].as_array();
            let first = rules
                .and_then(|arr| arr.first())
                .ok_or_else(|| AppError::ApiError("No rule returned".into()))?;
            let created: RulesetRule = serde_json::from_value(first.clone())
                .map_err(|e| AppError::ApiError(format!("Parse rule: {}", e)))?;
            Ok(FlatRule {
                id: created.id,
                ruleset_id: rs_id,
                phase: phase.to_string(),
                action: created.action,
                expression: created.expression,
                description: created.description,
                enabled: created.enabled,
                action_parameters: created.action_parameters,
            })
        }
    }

    /// 删除规则
    pub async fn delete_rule(
        &self,
        zone_id: &str,
        ruleset_id: &str,
        rule_id: &str,
    ) -> Result<(), AppError> {
        let url = format!(
            "{}/zones/{}/rulesets/{}/rules/{}",
            CF_API_BASE, zone_id, ruleset_id, rule_id
        );
        self.delete_req(&url).await?;
        Ok(())
    }
}
