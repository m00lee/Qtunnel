import { invoke } from '@tauri-apps/api/core'

// ====== 类型定义 ======

export interface ApiError {
  code: number
  message: string
}

export interface ApiResponse<T> {
  success: boolean
  data: T | null
  error: ApiError | null
}

export interface TunnelConnection {
  id: string
  colo_name: string | null
  is_pending_reconnect: boolean
  origin_ip: string | null
  opened_at: string | null
  client_id: string | null
  client_version: string | null
}

export interface Tunnel {
  id: string
  name: string
  status: string
  account_tag: string | null
  created_at: string | null
  deleted_at: string | null
  tun_type: string | null
  remote_config: boolean
  conns_active_at: string | null
  conns_inactive_at: string | null
  connections: TunnelConnection[]
}

export interface Zone {
  id: string
  name: string
  status: string
  paused: boolean
}

export interface IngressRule {
  hostname: string | null
  service: string
  path?: string | null
  originRequest?: unknown
}

export interface DnsRecord {
  id: string
  zone_id: string
  name: string
  record_type: string
  content: string
  ttl: number
  proxied: boolean
}

export interface CfAccessRule {
  id: string
  mode: string
  configuration: { target: string; value: string }
  notes: string
  created_on?: string | null
  modified_on?: string | null
}

export interface QuickBindResult {
  hostname: string
  service: string
  dns_record_id: string
  tunnel_id: string
}

export interface TokenPermission {
  effect: string
  resources: string[]
  permission_groups: string[]
}

export interface TokenVerifyResult {
  id: string
  status: string
  not_before: string | null
  expires_on: string | null
  message: string | null
  permissions: TokenPermission[]
}

export interface Settings {
  cf_api_token: string
  cf_account_id: string
  db_path: string
  cache_size: number
  cache_ttl: number
  log_level: string
  proxy_url: string | null
  proxy_no_verify: boolean
}

// ====== 通用调用封装 ======

async function call<T>(cmd: string, args?: Record<string, unknown>): Promise<ApiResponse<T>> {
  try {
    return await invoke<ApiResponse<T>>(cmd, args)
  } catch (e) {
    return {
      success: false,
      data: null,
      error: { code: 9999, message: String(e) },
    }
  }
}

// ====== Tunnel API ======

export function listTunnels() {
  return call<Tunnel[]>('list_tunnels')
}

export function getTunnel(tunnelId: string) {
  return call<Tunnel>('get_tunnel', { tunnelId })
}

export function createTunnel(name: string) {
  return call<Tunnel>('create_tunnel', { name })
}

export function deleteTunnel(tunnelId: string) {
  return call<void>('delete_tunnel', { tunnelId })
}

// ====== Zone API ======

export function listZones() {
  return call<Zone[]>('list_zones')
}

// ====== Tunnel Config API ======

export function getTunnelConfig(tunnelId: string) {
  return call<IngressRule[]>('get_tunnel_config', { tunnelId })
}

export function updateTunnelConfig(tunnelId: string, ingress: IngressRule[]) {
  return call<void>('update_tunnel_config', { tunnelId, ingress })
}

// ====== Service Binding API ======

export function quickBind(
  tunnelId: string,
  zoneId: string,
  zoneName: string,
  subdomain: string,
  protocol: string,
  localPort: number
) {
  return call<QuickBindResult>('quick_bind', {
    tunnelId,
    zoneId,
    zoneName,
    subdomain,
    protocol,
    localPort,
  })
}

export function unbindIngress(tunnelId: string, hostname: string) {
  return call<void>('unbind_ingress', { tunnelId, hostname })
}

// ====== DNS API ======

export function listDnsRecords(zoneId: string) {
  return call<DnsRecord[]>('list_dns_records', { zoneId })
}

export function createCname(zoneId: string, name: string, target: string) {
  return call<DnsRecord>('create_cname', { zoneId, name, target })
}

export function deleteDnsRecord(zoneId: string, recordId: string) {
  return call<void>('delete_dns_record', { zoneId, recordId })
}

// ====== Security API ======

export function listAccessRules(zoneId: string) {
  return call<CfAccessRule[]>('list_access_rules', { zoneId })
}

export function createAccessRule(zoneId: string, mode: string, ip: string, notes: string) {
  return call<CfAccessRule>('create_access_rule', { zoneId, mode, ip, notes })
}

export function deleteAccessRule(zoneId: string, ruleId: string) {
  return call<void>('delete_access_rule', { zoneId, ruleId })
}

// ====== Config API ======

export function saveSettings(opts: {
  apiToken: string
  accountId: string
  cacheSize?: number
  cacheTtl?: number
  logLevel?: string
  proxyUrl?: string | null
  proxyNoVerify?: boolean
}) {
  return call<void>('save_settings', {
    apiToken: opts.apiToken,
    accountId: opts.accountId,
    cacheSize: opts.cacheSize ?? 1000,
    cacheTtl: opts.cacheTtl ?? 300,
    logLevel: opts.logLevel ?? 'info',
    proxyUrl: opts.proxyUrl ?? null,
    proxyNoVerify: opts.proxyNoVerify ?? false,
  })
}

export function loadSettings() {
  return call<Settings>('load_settings')
}

export function setCredentials(apiToken: string, accountId: string) {
  return call<void>('set_credentials', { apiToken, accountId })
}

export function verifyToken() {
  return call<TokenVerifyResult>('verify_token')
}

// ====== Cache API ======

export function clearCache() {
  return call<void>('clear_cache')
}

export function getCacheStats() {
  return call<{ hits: number; misses: number; size: number; capacity: number }>('get_cache_stats')
}

// ====== Script Types ======

export interface Script {
  id: string
  name: string
  description: string
  code: string
  enabled: boolean
  created_at: string
  updated_at: string
}

export interface ScriptOutput {
  logs: ScriptLogEntry[]
  error: string | null
  duration_ms: number
  memory_used: number
}

export interface ScriptLogEntry {
  timestamp: string
  level: string
  message: string
}

// ====== Script API ======

export function listScripts() {
  return call<Script[]>('list_scripts')
}

export function createScript(name: string, description?: string, code?: string) {
  return call<Script>('create_script', { name, description, code })
}

export function updateScript(id: string, name: string, description: string, code: string) {
  return call<Script>('update_script', { id, name, description, code })
}

export function deleteScript(id: string) {
  return call<void>('delete_script', { id })
}

export function runScript(id: string) {
  return call<ScriptOutput>('run_script', { id })
}

// ====== Tunnel Run Types ======

export interface TunnelRunStatus {
  tunnel_id: string
  running: boolean
  message: string
}

// ====== Tunnel Run API ======

export function getTunnelToken(tunnelId: string) {
  return call<string>('get_tunnel_token', { tunnelId })
}

export function checkCloudflared() {
  return call<string>('check_cloudflared')
}

export function runTunnel(tunnelId: string) {
  return call<TunnelRunStatus>('run_tunnel', { tunnelId })
}

export function stopTunnel(tunnelId: string) {
  return call<TunnelRunStatus>('stop_tunnel', { tunnelId })
}

export function getRunningTunnels() {
  return call<string[]>('get_running_tunnels')
}

// ====== Zone Management Types ======

export interface ZoneAnalytics {
  requests: { all: number; cached: number; uncached: number }
  bandwidth: { all: number; cached: number; uncached: number }
  threats: { all: number }
  uniques: { all: number }
  pageviews: { all: number }
}

export interface ZoneSetting {
  id: string
  value: unknown
  editable: boolean
  modified_on: string | null
}

export interface FlatRule {
  id: string
  ruleset_id: string
  phase: string
  action: string
  expression: string
  description: string
  enabled: boolean
  action_parameters?: unknown
}

export interface PurgeResult {
  id: string
}

// ====== Zone Analytics API ======

export function getZoneAnalytics(zoneId: string, sinceMinutes?: number) {
  return call<ZoneAnalytics>('get_zone_analytics', { zoneId, sinceMinutes })
}

// ====== Zone Settings API ======

export function getZoneSettings(zoneId: string) {
  return call<ZoneSetting[]>('get_zone_settings', { zoneId })
}

export function updateZoneSetting(zoneId: string, settingId: string, value: unknown) {
  return call<ZoneSetting>('update_zone_setting', { zoneId, settingId, value })
}

// ====== Cache Purge API ======

export function purgeAllCache(zoneId: string) {
  return call<PurgeResult>('purge_all_cache', { zoneId })
}

export function purgeCacheByUrls(zoneId: string, urls: string[]) {
  return call<PurgeResult>('purge_cache_by_urls', { zoneId, urls })
}

// ====== Rulesets API ======

export function listRules(zoneId: string) {
  return call<FlatRule[]>('list_rules', { zoneId })
}

export function createRule(
  zoneId: string, phase: string, expression: string,
  action: string, actionParameters: unknown, description: string
) {
  return call<FlatRule>('create_rule', { zoneId, phase, expression, action, actionParameters, description })
}

export function deleteRule(zoneId: string, rulesetId: string, ruleId: string) {
  return call<void>('delete_rule', { zoneId, rulesetId, ruleId })
}
