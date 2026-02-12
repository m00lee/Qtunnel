#[cfg(test)]
mod tests {
    use crate::config::Config;
    use crate::cache::Cache;
    use crate::models::ApiResponse;

    // ── Config Tests ───────────────────────────────────

    #[test]
    fn test_config_default_values() {
        let cfg = Config::default();
        assert_eq!(cfg.cache_size, 1000);
        assert_eq!(cfg.cache_ttl, 300);
        assert_eq!(cfg.log_level, "info");
        assert_eq!(cfg.max_scripts, 10);
        assert_eq!(cfg.script_memory_mb, 10);
        assert_eq!(cfg.script_timeout_ms, 5000);
        assert_eq!(cfg.script_concurrency, 3);
        assert!(cfg.cf_api_token.is_empty());
        assert!(cfg.cf_account_id.is_empty());
    }

    #[test]
    fn test_config_serialize_deserialize() {
        let cfg = Config {
            cf_api_token: "test_token".to_string(),
            cf_account_id: "test_account".to_string(),
            ..Config::default()
        };
        let json = serde_json::to_string(&cfg).unwrap();
        let parsed: Config = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed.cf_api_token, "test_token");
        assert_eq!(parsed.cf_account_id, "test_account");
        assert_eq!(parsed.cache_size, 1000);
    }

    #[test]
    fn test_config_deserialize_partial_json() {
        // 只提供部分字段，其余走默认值
        let json = r#"{"cf_api_token":"tk","cf_account_id":"ac"}"#;
        let cfg: Config = serde_json::from_str(json).unwrap();
        assert_eq!(cfg.cf_api_token, "tk");
        assert_eq!(cfg.cache_size, 1000); // default
        assert_eq!(cfg.log_level, "info"); // default
    }

    #[test]
    fn test_config_save_and_load() {
        let dir = std::env::temp_dir().join("qtunnel_test_config");
        std::fs::create_dir_all(&dir).ok();
        let path = dir.join("test_config.json");
        let path_str = path.to_string_lossy().to_string();

        let cfg = Config {
            cf_api_token: "save_test".to_string(),
            cache_size: 500,
            ..Config::default()
        };
        cfg.save(&path_str).unwrap();

        let loaded = Config::load(&path_str).unwrap();
        assert_eq!(loaded.cf_api_token, "save_test");
        assert_eq!(loaded.cache_size, 500);

        // 清理
        std::fs::remove_file(&path).ok();
        std::fs::remove_dir(&dir).ok();
    }

    // ── Cache Tests ────────────────────────────────────

    #[tokio::test]
    async fn test_cache_set_and_get() {
        let cache: Cache<String> = Cache::new(10);
        cache.set("key1".to_string(), "value1".to_string(), 60).await;
        let result = cache.get("key1").await;
        assert_eq!(result, Some("value1".to_string()));
    }

    #[tokio::test]
    async fn test_cache_miss() {
        let cache: Cache<String> = Cache::new(10);
        let result = cache.get("nonexistent").await;
        assert_eq!(result, None);
    }

    #[tokio::test]
    async fn test_cache_clear() {
        let cache: Cache<String> = Cache::new(10);
        cache.set("a".to_string(), "1".to_string(), 60).await;
        cache.set("b".to_string(), "2".to_string(), 60).await;
        cache.clear().await;
        assert_eq!(cache.get("a").await, None);
        assert_eq!(cache.get("b").await, None);
        let stats = cache.get_stats().await;
        assert_eq!(stats.size, 0);
    }

    #[tokio::test]
    async fn test_cache_stats() {
        let cache: Cache<String> = Cache::new(10);
        cache.set("k".to_string(), "v".to_string(), 60).await;
        let _ = cache.get("k").await; // hit
        let _ = cache.get("miss").await; // miss
        let stats = cache.get_stats().await;
        assert_eq!(stats.hits, 1);
        assert_eq!(stats.misses, 1);
        assert_eq!(stats.size, 1);
    }

    #[tokio::test]
    async fn test_cache_remove() {
        let cache: Cache<String> = Cache::new(10);
        cache.set("rm".to_string(), "val".to_string(), 60).await;
        cache.remove("rm").await;
        assert_eq!(cache.get("rm").await, None);
    }

    #[tokio::test]
    async fn test_cache_ttl_expiry() {
        let cache: Cache<String> = Cache::new(10);
        // TTL = 1 秒，等 2 秒后一定过期 (elapsed=2 > ttl=1)
        cache.set("expired".to_string(), "val".to_string(), 1).await;
        tokio::time::sleep(std::time::Duration::from_secs(2)).await;
        assert_eq!(cache.get("expired").await, None);
    }

    #[tokio::test]
    async fn test_cache_lru_eviction() {
        let cache: Cache<String> = Cache::new(2); // 容量 = 2
        cache.set("a".to_string(), "1".to_string(), 60).await;
        cache.set("b".to_string(), "2".to_string(), 60).await;
        cache.set("c".to_string(), "3".to_string(), 60).await; // 触发淘汰
        // 'a' 应被淘汰
        assert_eq!(cache.get("a").await, None);
        assert_eq!(cache.get("c").await, Some("3".to_string()));
    }

    // ── ApiResponse Tests ──────────────────────────────

    #[test]
    fn test_api_response_ok() {
        let resp = ApiResponse::ok(42);
        assert!(resp.success);
        assert_eq!(resp.data, Some(42));
        assert!(resp.error.is_none());
    }

    #[test]
    fn test_api_response_err() {
        let resp: ApiResponse<()> = ApiResponse::err(1001, "test error".to_string());
        assert!(!resp.success);
        assert!(resp.data.is_none());
        assert_eq!(resp.error.as_ref().unwrap().code, 1001);
        assert_eq!(resp.error.as_ref().unwrap().message, "test error");
    }

    #[test]
    fn test_api_response_serialize() {
        let resp = ApiResponse::ok("hello".to_string());
        let json = serde_json::to_string(&resp).unwrap();
        assert!(json.contains("\"success\":true"));
        assert!(json.contains("\"hello\""));
    }

    // ── Error Tests ────────────────────────────────────

    #[test]
    fn test_error_codes() {
        use crate::error::AppError;
        assert_eq!(AppError::DatabaseError("x".into()).code(), 1001);
        assert_eq!(AppError::ApiError("x".into()).code(), 1002);
        assert_eq!(AppError::InvalidToken.code(), 1003);
        assert_eq!(AppError::NetworkError("x".into()).code(), 1008);
        assert_eq!(AppError::Unauthorized.code(), 1009);
    }

    #[test]
    fn test_error_display() {
        use crate::error::AppError;
        let err = AppError::NetworkError("timeout".to_string());
        assert_eq!(format!("{}", err), "Network error: timeout");
    }

    // ── Model Tests ────────────────────────────────────

    #[test]
    fn test_tunnel_deserialize() {
        use crate::models::Tunnel;
        let json = r#"{
            "id": "t-123",
            "name": "test-tunnel",
            "status": "healthy",
            "connections": []
        }"#;
        let tunnel: Tunnel = serde_json::from_str(json).unwrap();
        assert_eq!(tunnel.id, "t-123");
        assert_eq!(tunnel.name, "test-tunnel");
        assert_eq!(tunnel.status, "healthy");
        assert!(tunnel.connections.is_empty());
    }

    #[test]
    fn test_tunnel_deserialize_partial() {
        use crate::models::Tunnel;
        // 只有必需字段
        let json = r#"{"id": "x", "name": "y"}"#;
        let tunnel: Tunnel = serde_json::from_str(json).unwrap();
        assert_eq!(tunnel.id, "x");
        assert!(tunnel.created_at.is_none());
        assert!(!tunnel.remote_config);
    }

    #[test]
    fn test_script_model() {
        use crate::models::Script;
        let json = r#"{
            "id": "s1",
            "name": "test",
            "code": "print('hi')",
            "created_at": "2026-01-01",
            "updated_at": "2026-01-01"
        }"#;
        let script: Script = serde_json::from_str(json).unwrap();
        assert_eq!(script.name, "test");
        assert!(script.enabled); // default_true
        assert!(script.description.is_empty()); // default empty
    }

    #[test]
    fn test_ingress_rule_serialize() {
        use crate::models::CfIngressRule;
        let catch_all = CfIngressRule {
            hostname: None,
            service: "http_status:404".to_string(),
            path: None,
            origin_request: None,
        };
        let json = serde_json::to_string(&catch_all).unwrap();
        assert!(!json.contains("hostname")); // skip_serializing_if None
        assert!(json.contains("http_status:404"));
    }

    // ── CFApi Client Tests ─────────────────────────────

    #[test]
    fn test_cfapi_credentials() {
        use crate::api::CFApi;
        let mut api = CFApi::new();
        assert!(!api.has_credentials());
        assert!(api.get_token().is_empty());

        api.set_credentials("token123".to_string(), "acc456".to_string());
        assert!(api.has_credentials());
        assert_eq!(api.get_token(), "token123");
        assert_eq!(api.get_account_id(), "acc456");
    }

    #[test]
    fn test_cfapi_auth_header_empty() {
        use crate::api::CFApi;
        let api = CFApi::new();
        let result = api.auth_header();
        assert!(result.is_err()); // Unauthorized
    }

    #[test]
    fn test_cfapi_auth_header_valid() {
        use crate::api::CFApi;
        let mut api = CFApi::new();
        api.set_credentials("mytoken".to_string(), "acc".to_string());
        let header = api.auth_header().unwrap();
        assert_eq!(header, "Bearer mytoken");
    }

    // ── Token Permission Check ─────────────────────────

    #[test]
    fn test_check_permission_exists() {
        use crate::api::CFApi;
        use crate::models::TokenPermission;
        let perms = vec![TokenPermission {
            effect: "allow".to_string(),
            resources: vec!["com.cloudflare.api.account.*".to_string()],
            permission_groups: vec!["DNS Read".to_string(), "Tunnel Write".to_string()],
        }];
        assert!(CFApi::check_permission(&perms, "DNS"));
        assert!(CFApi::check_permission(&perms, "tunnel"));
        assert!(!CFApi::check_permission(&perms, "Firewall"));
    }

    #[test]
    fn test_check_permission_deny_effect() {
        use crate::api::CFApi;
        use crate::models::TokenPermission;
        let perms = vec![TokenPermission {
            effect: "deny".to_string(),
            resources: vec![],
            permission_groups: vec!["DNS Read".to_string()],
        }];
        // deny effect 不算 "有权限"
        assert!(!CFApi::check_permission(&perms, "DNS"));
    }
}
