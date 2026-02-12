use std::fs;
use std::path::PathBuf;

const CREDENTIAL_FILE: &str = "credentials.dat";

/// 文件级凭据存储（XOR 混淆 + 独立文件，比明文 config.json 更安全）
///
/// 当系统密钥环可用时（未来），升级为 keyring-rs 即可无感切换。
/// 当前通过 XOR 混淆防止凭据以明文出现在磁盘上。
pub struct CredentialStore;

impl CredentialStore {
    fn cred_path() -> PathBuf {
        let home = std::env::var("HOME")
            .or_else(|_| std::env::var("USERPROFILE"))
            .unwrap_or_else(|_| ".".to_string());
        PathBuf::from(home).join(".config").join("qtunnel").join(CREDENTIAL_FILE)
    }

    /// 将凭据混淆后存储到独立文件
    pub fn store(token: &str, account_id: &str) -> Result<(), String> {
        let path = Self::cred_path();
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent).map_err(|e| format!("Create dir: {}", e))?;
        }
        let payload = format!("{}:{}", token, account_id);
        let obfuscated = Self::obfuscate(payload.as_bytes());
        fs::write(&path, obfuscated).map_err(|e| format!("Write credentials: {}", e))?;

        // 限制文件权限（仅所有者读写）
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            let perms = fs::Permissions::from_mode(0o600);
            fs::set_permissions(&path, perms).ok();
        }

        tracing::info!("Credentials stored securely");
        Ok(())
    }

    /// 从独立文件读取并解混淆凭据
    pub fn load() -> Option<(String, String)> {
        let path = Self::cred_path();
        let data = fs::read(&path).ok()?;
        let decoded = Self::deobfuscate(&data);
        let payload = String::from_utf8(decoded).ok()?;
        let (token, account_id) = payload.split_once(':')?;
        if token.is_empty() || account_id.is_empty() {
            return None;
        }
        Some((token.to_string(), account_id.to_string()))
    }

    /// 删除凭据文件
    pub fn delete() -> Result<(), String> {
        let path = Self::cred_path();
        if path.exists() {
            fs::remove_file(&path).map_err(|e| format!("Delete credentials: {}", e))?;
        }
        tracing::info!("Credentials removed");
        Ok(())
    }

    /// 检测凭据存储是否可用
    pub fn is_available() -> bool {
        if let Some(parent) = Self::cred_path().parent() {
            fs::create_dir_all(parent).is_ok()
        } else {
            false
        }
    }

    // ── XOR 混淆（非加密，但防止明文泄露）──

    fn derive_key() -> Vec<u8> {
        // 基于机器特征生成 key（hostname + username），使凭据文件不可跨机器复制
        let user = std::env::var("USER")
            .or_else(|_| std::env::var("USERNAME"))
            .unwrap_or_else(|_| "qtunnel".to_string());
        let host = std::env::var("HOSTNAME")
            .or_else(|_| fs::read_to_string("/etc/hostname").map(|s| s.trim().to_string()))
            .unwrap_or_else(|_| "localhost".to_string());
        let seed = format!("qtunnel:{}@{}", user, host);
        // 做简单的 hash 展开
        let mut key = Vec::with_capacity(64);
        let mut h: u64 = 0xcbf29ce484222325; // FNV offset basis
        for b in seed.bytes() {
            h ^= b as u64;
            h = h.wrapping_mul(0x100000001b3); // FNV prime
            key.push((h >> 24) as u8);
        }
        while key.len() < 64 {
            h = h.wrapping_mul(0x100000001b3).wrapping_add(key.len() as u64);
            key.push((h >> 16) as u8);
        }
        key
    }

    fn obfuscate(data: &[u8]) -> Vec<u8> {
        let key = Self::derive_key();
        data.iter()
            .enumerate()
            .map(|(i, b)| b ^ key[i % key.len()])
            .collect()
    }

    fn deobfuscate(data: &[u8]) -> Vec<u8> {
        Self::obfuscate(data) // XOR 对称
    }
}
