use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Script {
    pub id: String,
    pub name: String,
    #[serde(default)]
    pub description: String,
    pub code: String,
    #[serde(default = "default_true")]
    pub enabled: bool,
    pub created_at: String,
    pub updated_at: String,
}

fn default_true() -> bool { true }

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScriptOutput {
    pub logs: Vec<ScriptLogEntry>,
    pub error: Option<String>,
    pub duration_ms: u64,
    pub memory_used: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScriptLogEntry {
    pub timestamp: String,
    pub level: String,
    pub message: String,
}
