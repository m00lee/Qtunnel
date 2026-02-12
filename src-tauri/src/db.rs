use crate::error::AppError;
use sqlx::sqlite::{SqliteConnectOptions, SqlitePoolOptions};
use sqlx::Pool;

pub struct Database {
    pool: Option<Pool<sqlx::Sqlite>>,
}

impl Default for Database {
    fn default() -> Self {
        Self::new()
    }
}

impl Database {
    pub fn new() -> Self {
        Database { pool: None }
    }

    pub async fn init(&mut self, db_path: &str) -> Result<(), AppError> {
        let options = SqliteConnectOptions::new()
            .filename(db_path)
            .create_if_missing(true);

        let pool = SqlitePoolOptions::new()
            .max_connections(5)
            .connect_with(options)
            .await
            .map_err(|e| AppError::DatabaseError(e.to_string()))?;

        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS tunnels (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                account_tag TEXT NOT NULL,
                status TEXT NOT NULL,
                token TEXT NOT NULL,
                created_at DATETIME NOT NULL
            )
            "#,
        )
        .execute(&pool)
        .await
        .map_err(|e| AppError::DatabaseError(e.to_string()))?;

        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS routes (
                id TEXT PRIMARY KEY,
                tunnel_id TEXT NOT NULL,
                hostname TEXT NOT NULL,
                service TEXT NOT NULL,
                path TEXT,
                priority INTEGER NOT NULL,
                FOREIGN KEY (tunnel_id) REFERENCES tunnels(id)
            )
            "#,
        )
        .execute(&pool)
        .await
        .map_err(|e| AppError::DatabaseError(e.to_string()))?;

        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS local_services (
                id TEXT PRIMARY KEY,
                tunnel_id TEXT NOT NULL,
                name TEXT NOT NULL,
                local_addr TEXT NOT NULL,
                local_port INTEGER NOT NULL,
                subdomain TEXT NOT NULL,
                status TEXT NOT NULL,
                created_at DATETIME NOT NULL,
                FOREIGN KEY (tunnel_id) REFERENCES tunnels(id)
            )
            "#,
        )
        .execute(&pool)
        .await
        .map_err(|e| AppError::DatabaseError(e.to_string()))?;

        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS service_metrics (
                id TEXT PRIMARY KEY,
                service_id TEXT NOT NULL,
                total_requests INTEGER NOT NULL,
                total_bytes_in INTEGER NOT NULL,
                total_bytes_out INTEGER NOT NULL,
                uptime_seconds INTEGER NOT NULL,
                last_check DATETIME NOT NULL,
                FOREIGN KEY (service_id) REFERENCES local_services(id)
            )
            "#,
        )
        .execute(&pool)
        .await
        .map_err(|e| AppError::DatabaseError(e.to_string()))?;

        self.pool = Some(pool);
        Ok(())
    }

    pub fn get_pool(&self) -> Option<&Pool<sqlx::Sqlite>> {
        self.pool.as_ref()
    }
}

impl Clone for Database {
    fn clone(&self) -> Self {
        Database {
            pool: self.pool.clone(),
        }
    }
}
