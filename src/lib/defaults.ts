/**
 * 应用默认配置
 * 凭据由后端 config 优先级链管理（~/.config/qtunnel/ → .env → 空）
 * 前端不再存储任何凭据，仅从后端 load_settings 获取
 */
export const DEFAULT_CACHE_SIZE = 1000
export const DEFAULT_CACHE_TTL = 300
export const DEFAULT_LOG_LEVEL = 'info'
