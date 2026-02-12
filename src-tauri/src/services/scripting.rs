use std::path::PathBuf;
use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio::sync::RwLock;

use crate::models::{ApiResponse, Script, ScriptLogEntry, ScriptOutput};
use tauri::State;

// ======== Script Store（文件持久化） ========

pub struct ScriptStore {
    scripts: Arc<RwLock<Vec<Script>>>,
    file_path: PathBuf,
}

impl ScriptStore {
    pub fn new(file_path: PathBuf) -> Self {
        let scripts = if file_path.exists() {
            let content = std::fs::read_to_string(&file_path).unwrap_or_default();
            serde_json::from_str(&content).unwrap_or_default()
        } else {
            vec![]
        };
        ScriptStore {
            scripts: Arc::new(RwLock::new(scripts)),
            file_path,
        }
    }

    fn persist(&self, scripts: &[Script]) {
        if let Some(parent) = self.file_path.parent() {
            std::fs::create_dir_all(parent).ok();
        }
        if let Ok(json) = serde_json::to_string_pretty(scripts) {
            std::fs::write(&self.file_path, json).ok();
        }
    }

    pub async fn list(&self) -> Vec<Script> {
        self.scripts.read().await.clone()
    }

    pub async fn get(&self, id: &str) -> Option<Script> {
        self.scripts.read().await.iter().find(|s| s.id == id).cloned()
    }

    pub async fn count(&self) -> usize {
        self.scripts.read().await.len()
    }

    pub async fn create(&self, name: String, description: String, code: String) -> Script {
        let now = chrono::Utc::now().to_rfc3339();
        let script = Script {
            id: uuid::Uuid::new_v4().to_string(),
            name,
            description,
            code,
            enabled: true,
            created_at: now.clone(),
            updated_at: now,
        };
        let mut scripts = self.scripts.write().await;
        scripts.push(script.clone());
        self.persist(&scripts);
        script
    }

    pub async fn update(&self, id: &str, name: String, description: String, code: String) -> Option<Script> {
        let mut scripts = self.scripts.write().await;
        if let Some(s) = scripts.iter_mut().find(|s| s.id == id) {
            s.name = name;
            s.description = description;
            s.code = code;
            s.updated_at = chrono::Utc::now().to_rfc3339();
            let updated = s.clone();
            self.persist(&scripts);
            Some(updated)
        } else {
            None
        }
    }

    pub async fn delete(&self, id: &str) -> bool {
        let mut scripts = self.scripts.write().await;
        let len = scripts.len();
        scripts.retain(|s| s.id != id);
        let deleted = scripts.len() < len;
        if deleted {
            self.persist(&scripts);
        }
        deleted
    }
}

impl Clone for ScriptStore {
    fn clone(&self) -> Self {
        ScriptStore {
            scripts: self.scripts.clone(),
            file_path: self.file_path.clone(),
        }
    }
}

// ======== Lua 执行引擎 ========

fn lua_value_to_string(v: &mlua::Value) -> String {
    match v {
        mlua::Value::Nil => "nil".to_string(),
        mlua::Value::Boolean(b) => b.to_string(),
        mlua::Value::Integer(n) => n.to_string(),
        mlua::Value::Number(n) => format!("{}", n),
        mlua::Value::String(s) => s.to_str().map(|s| s.to_string()).unwrap_or_else(|_| "<invalid utf8>".to_string()),
        mlua::Value::Table(_) => "[table]".to_string(),
        mlua::Value::Function(_) => "[function]".to_string(),
        _ => format!("[{:?}]", v),
    }
}

/// Lua API prelude — 在用户脚本之前自动执行
const LUA_PRELUDE: &str = r#"
-- QTunnel Lua API 便捷方法
cf.list_tunnels = function()
    return cf.get("/accounts/" .. cf.account_id .. "/cfd_tunnel?is_deleted=false&per_page=100")
end

cf.list_zones = function()
    return cf.get("/zones?per_page=50&status=active")
end

cf.list_dns_records = function(zone_id)
    return cf.get("/zones/" .. zone_id .. "/dns_records?per_page=100")
end

cf.get_tunnel = function(tunnel_id)
    return cf.get("/accounts/" .. cf.account_id .. "/cfd_tunnel/" .. tunnel_id)
end
"#;

fn execute_lua(
    code: String,
    api_token: String,
    account_id: String,
    max_memory_bytes: usize,
    max_time_ms: u64,
) -> Result<ScriptOutput, String> {
    use mlua::prelude::*;

    let start = Instant::now();
    let logs = Arc::new(std::sync::Mutex::new(Vec::<ScriptLogEntry>::new()));

    let lua = Lua::new();

    // 内存限制
    if max_memory_bytes > 0 {
        let _ = lua.set_memory_limit(max_memory_bytes);
    }

    // 执行时间限制（通过指令计数 hook）
    let max_duration = Duration::from_millis(max_time_ms);
    let hook_start = Instant::now();
    lua.set_hook(
        mlua::HookTriggers::new().every_nth_instruction(10000),
        move |_lua, _debug| {
            if hook_start.elapsed() > max_duration {
                Err(mlua::Error::RuntimeError(
                    format!("脚本执行超时 (>{}ms)", max_time_ms),
                ))
            } else {
                Ok(mlua::VmState::Continue)
            }
        },
    );

    // ── 注册 print ──
    {
        let logs_ref = logs.clone();
        lua.globals()
            .set(
                "print",
                lua.create_function(move |_, args: mlua::MultiValue| {
                    let parts: Vec<String> = args.iter().map(lua_value_to_string).collect();
                    let message = parts.join("\t");
                    logs_ref.lock().unwrap().push(ScriptLogEntry {
                        timestamp: chrono::Utc::now().to_rfc3339(),
                        level: "info".to_string(),
                        message,
                    });
                    Ok(())
                })
                .map_err(|e| e.to_string())?,
            )
            .map_err(|e| e.to_string())?;
    }

    // ── 注册 log 表 ──
    {
        let log_table = lua.create_table().map_err(|e| e.to_string())?;

        for level_name in &["info", "warn", "error"] {
            let logs_ref = logs.clone();
            let level = level_name.to_string();
            log_table
                .set(
                    *level_name,
                    lua.create_function(move |_, msg: String| {
                        logs_ref.lock().unwrap().push(ScriptLogEntry {
                            timestamp: chrono::Utc::now().to_rfc3339(),
                            level: level.clone(),
                            message: msg,
                        });
                        Ok(())
                    })
                    .map_err(|e| e.to_string())?,
                )
                .map_err(|e| e.to_string())?;
        }

        lua.globals().set("log", log_table).map_err(|e| e.to_string())?;
    }

    // ── 注册 sleep ──
    lua.globals()
        .set(
            "sleep",
            lua.create_function(|_, ms: u64| {
                let ms = ms.min(1000); // 最大 1 秒
                std::thread::sleep(Duration::from_millis(ms));
                Ok(())
            })
            .map_err(|e| e.to_string())?,
        )
        .map_err(|e| e.to_string())?;

    // ── 注册 cf 表（Cloudflare API） ──
    {
        let cf_table = lua.create_table().map_err(|e| e.to_string())?;

        // cf.account_id
        cf_table
            .set("account_id", account_id.clone())
            .map_err(|e| e.to_string())?;

        // cf.get(path) → table
        {
            let token = api_token.clone();
            let logs_ref = logs.clone();
            cf_table
                .set(
                    "get",
                    lua.create_function(move |lua_ctx, path: String| {
                        let url = format!("https://api.cloudflare.com/client/v4{}", path);
                        let client = reqwest::blocking::Client::new();
                        let response = client
                            .get(&url)
                            .header("Authorization", format!("Bearer {}", token))
                            .header("Content-Type", "application/json")
                            .timeout(Duration::from_secs(10))
                            .send()
                            .and_then(|r| r.json::<serde_json::Value>());

                        match response {
                            Ok(body) => {
                                let result = body.get("result").cloned().unwrap_or(serde_json::Value::Null);
                                lua_ctx.to_value(&result)
                                    .map_err(|e| mlua::Error::RuntimeError(format!("序列化失败: {}", e)))
                            }
                            Err(e) => {
                                logs_ref.lock().unwrap().push(ScriptLogEntry {
                                    timestamp: chrono::Utc::now().to_rfc3339(),
                                    level: "error".to_string(),
                                    message: format!("cf.get 失败: {}", e),
                                });
                                Err(mlua::Error::RuntimeError(format!("HTTP 请求失败: {}", e)))
                            }
                        }
                    })
                    .map_err(|e| e.to_string())?,
                )
                .map_err(|e| e.to_string())?;
        }

        // cf.post(path, body) → table
        {
            let token = api_token.clone();
            let logs_ref = logs.clone();
            cf_table
                .set(
                    "post",
                    lua.create_function(move |lua_ctx, (path, body): (String, mlua::Value)| {
                        let url = format!("https://api.cloudflare.com/client/v4{}", path);
                        let body_json: serde_json::Value = lua_ctx.from_value(body)
                            .map_err(|e| mlua::Error::RuntimeError(format!("参数序列化失败: {}", e)))?;

                        let client = reqwest::blocking::Client::new();
                        let response = client
                            .post(&url)
                            .header("Authorization", format!("Bearer {}", token))
                            .header("Content-Type", "application/json")
                            .timeout(Duration::from_secs(10))
                            .json(&body_json)
                            .send()
                            .and_then(|r| r.json::<serde_json::Value>());

                        match response {
                            Ok(body) => {
                                let result = body.get("result").cloned().unwrap_or(serde_json::Value::Null);
                                lua_ctx.to_value(&result)
                                    .map_err(|e| mlua::Error::RuntimeError(format!("序列化失败: {}", e)))
                            }
                            Err(e) => {
                                logs_ref.lock().unwrap().push(ScriptLogEntry {
                                    timestamp: chrono::Utc::now().to_rfc3339(),
                                    level: "error".to_string(),
                                    message: format!("cf.post 失败: {}", e),
                                });
                                Err(mlua::Error::RuntimeError(format!("HTTP 请求失败: {}", e)))
                            }
                        }
                    })
                    .map_err(|e| e.to_string())?,
                )
                .map_err(|e| e.to_string())?;
        }

        // cf.put(path, body) → table
        {
            let token = api_token.clone();
            cf_table
                .set(
                    "put",
                    lua.create_function(move |lua_ctx, (path, body): (String, mlua::Value)| {
                        let url = format!("https://api.cloudflare.com/client/v4{}", path);
                        let body_json: serde_json::Value = lua_ctx.from_value(body)
                            .map_err(|e| mlua::Error::RuntimeError(format!("参数序列化失败: {}", e)))?;

                        let client = reqwest::blocking::Client::new();
                        let response = client
                            .put(&url)
                            .header("Authorization", format!("Bearer {}", token))
                            .header("Content-Type", "application/json")
                            .timeout(Duration::from_secs(10))
                            .json(&body_json)
                            .send()
                            .and_then(|r| r.json::<serde_json::Value>());

                        match response {
                            Ok(body) => {
                                let result = body.get("result").cloned().unwrap_or(serde_json::Value::Null);
                                lua_ctx.to_value(&result)
                                    .map_err(|e| mlua::Error::RuntimeError(format!("序列化失败: {}", e)))
                            }
                            Err(e) => Err(mlua::Error::RuntimeError(format!("HTTP 请求失败: {}", e)))
                        }
                    })
                    .map_err(|e| e.to_string())?,
                )
                .map_err(|e| e.to_string())?;
        }

        // cf.delete(path) → table
        {
            let token = api_token.clone();
            cf_table
                .set(
                    "delete",
                    lua.create_function(move |lua_ctx, path: String| {
                        let url = format!("https://api.cloudflare.com/client/v4{}", path);
                        let client = reqwest::blocking::Client::new();
                        let response = client
                            .delete(&url)
                            .header("Authorization", format!("Bearer {}", token))
                            .header("Content-Type", "application/json")
                            .timeout(Duration::from_secs(10))
                            .send()
                            .and_then(|r| r.json::<serde_json::Value>());

                        match response {
                            Ok(body) => {
                                let result = body.get("result").cloned().unwrap_or(serde_json::Value::Null);
                                lua_ctx.to_value(&result)
                                    .map_err(|e| mlua::Error::RuntimeError(format!("序列化失败: {}", e)))
                            }
                            Err(e) => Err(mlua::Error::RuntimeError(format!("HTTP 请求失败: {}", e)))
                        }
                    })
                    .map_err(|e| e.to_string())?,
                )
                .map_err(|e| e.to_string())?;
        }

        lua.globals().set("cf", cf_table).map_err(|e| e.to_string())?;
    }

    // ── 执行 prelude + 用户脚本 ──
    let full_code = format!("{}\n{}", LUA_PRELUDE, code);
    let exec_err = match lua.load(&full_code).exec() {
        Ok(_) => None,
        Err(e) => Some(e.to_string()),
    };

    let duration_ms = start.elapsed().as_millis() as u64;
    let memory_used = lua.used_memory();
    let log_entries = logs.lock().unwrap().clone();

    Ok(ScriptOutput {
        logs: log_entries,
        error: exec_err,
        duration_ms,
        memory_used,
    })
}

// ======== Tauri Commands ========

#[tauri::command]
pub async fn list_scripts(
    state: State<'_, crate::AppState>,
) -> Result<ApiResponse<Vec<Script>>, String> {
    let scripts = state.script_store.list().await;
    Ok(ApiResponse::ok(scripts))
}

#[tauri::command]
pub async fn create_script(
    name: String,
    description: Option<String>,
    code: Option<String>,
    state: State<'_, crate::AppState>,
) -> Result<ApiResponse<Script>, String> {
    // 检查脚本数量限制
    let cfg = crate::config::Config::load_with_priority(None);
    let count = state.script_store.count().await;
    if count >= cfg.max_scripts {
        return Ok(ApiResponse::err(
            2001,
            format!("脚本数量已达上限 ({})", cfg.max_scripts),
        ));
    }

    let default_code = r#"-- QTunnel Lua 脚本
-- 可用 API:
--   print(...)                    输出到控制台
--   log.info(msg)                 信息日志
--   log.warn(msg)                 警告日志
--   log.error(msg)                错误日志
--   cf.get(path)                  Cloudflare API GET
--   cf.post(path, body)           Cloudflare API POST
--   cf.put(path, body)            Cloudflare API PUT
--   cf.delete(path)               Cloudflare API DELETE
--   cf.list_tunnels()             列出所有隧道
--   cf.list_zones()               列出所有域名
--   cf.list_dns_records(zone_id)  列出 DNS 记录
--   cf.account_id                 当前账户 ID
--   sleep(ms)                     休眠（最大 1000ms）

print("Hello from QTunnel!")
"#;

    let script = state
        .script_store
        .create(
            name,
            description.unwrap_or_default(),
            code.unwrap_or_else(|| default_code.to_string()),
        )
        .await;

    Ok(ApiResponse::ok(script))
}

#[tauri::command]
pub async fn update_script(
    id: String,
    name: String,
    description: String,
    code: String,
    state: State<'_, crate::AppState>,
) -> Result<ApiResponse<Script>, String> {
    match state.script_store.update(&id, name, description, code).await {
        Some(script) => Ok(ApiResponse::ok(script)),
        None => Ok(ApiResponse::err(2002, "脚本不存在".to_string())),
    }
}

#[tauri::command]
pub async fn delete_script(
    id: String,
    state: State<'_, crate::AppState>,
) -> Result<ApiResponse<()>, String> {
    if state.script_store.delete(&id).await {
        Ok(ApiResponse::ok(()))
    } else {
        Ok(ApiResponse::err(2002, "脚本不存在".to_string()))
    }
}

#[tauri::command]
pub async fn run_script(
    id: String,
    state: State<'_, crate::AppState>,
) -> Result<ApiResponse<ScriptOutput>, String> {
    // 获取脚本
    let script = match state.script_store.get(&id).await {
        Some(s) => s,
        None => return Ok(ApiResponse::err(2002, "脚本不存在".to_string())),
    };

    // 获取并发信号量
    let permit = match state.script_semaphore.try_acquire() {
        Ok(p) => p,
        Err(_) => {
            return Ok(ApiResponse::err(
                2003,
                "并发执行数已达上限，请稍后重试".to_string(),
            ));
        }
    };

    // 获取凭据
    let api = state.cf_api.read().await;
    let token = api.get_token().to_string();
    let account = api.get_account_id().to_string();
    drop(api);

    // 获取限制配置
    let cfg = crate::config::Config::load_with_priority(None);
    let max_memory = cfg.script_memory_mb * 1024 * 1024;
    let max_time = cfg.script_timeout_ms;

    let code = script.code.clone();

    // 在阻塞线程中执行 Lua（Lua VM 是 !Send，必须在单线程中完成）
    let output = tokio::task::spawn_blocking(move || {
        execute_lua(code, token, account, max_memory, max_time)
    })
    .await
    .map_err(|e| format!("任务执行失败: {}", e))?;

    drop(permit);

    match output {
        Ok(out) => Ok(ApiResponse::ok(out)),
        Err(e) => Ok(ApiResponse::err(2004, e)),
    }
}
