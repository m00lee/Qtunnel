'use client'

import { useState, useEffect } from 'react'
import { Save, RotateCcw, ShieldCheck, Loader2, Eye, EyeOff, CheckCircle2, XCircle, Clock, Key, Code, Globe } from 'lucide-react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Label from '@/components/ui/Label'
import Select from '@/components/ui/Select'
import { useAppStore } from '@/lib/store'
import { loadSettings, setCredentials, saveSettings, verifyToken, type TokenVerifyResult } from '@/lib/api'

/** 部分掩码：保留前8位和后4位，中间用 •••• 替代 */
function maskToken(token: string): string {
  if (!token) return ''
  if (token.length <= 12) return token.substring(0, 2) + '••••' + token.substring(token.length - 2)
  return token.substring(0, 8) + '••••••••' + token.substring(token.length - 4)
}

export default function SettingsPage() {
  const { theme, setTheme } = useAppStore()
  const [apiToken, setApiToken] = useState('')
  const [accountId, setAccountId] = useState('')
  const [logLevel, setLogLevel] = useState('info')
  const [language, setLanguage] = useState('zh-CN')
  const [autoStart, setAutoStart] = useState(true)
  const [notifications, setNotifications] = useState(true)
  const [maxScripts, setMaxScripts] = useState(10)
  const [scriptMemory, setScriptMemory] = useState(10)
  const [scriptTimeout, setScriptTimeout] = useState(5000)
  const [scriptConcurrency, setScriptConcurrency] = useState(3)
  const [proxyUrl, setProxyUrl] = useState('')
  const [proxyNoVerify, setProxyNoVerify] = useState(false)

  const [showToken, setShowToken] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [verifyResult, setVerifyResult] = useState<TokenVerifyResult | null>(null)
  const [verifyError, setVerifyError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // 从后端加载已有配置（优先级：~/.config/qtunnel/ → .env → 空）
  useEffect(() => {
    ;(async () => {
      const resp = await loadSettings()
      if (resp.success && resp.data) {
        const cfg = resp.data
        if (cfg.cf_api_token) setApiToken(cfg.cf_api_token)
        if (cfg.cf_account_id) setAccountId(cfg.cf_account_id)
        if (cfg.log_level) setLogLevel(cfg.log_level)
        if (cfg.proxy_url) setProxyUrl(cfg.proxy_url)
        if (cfg.proxy_no_verify) setProxyNoVerify(cfg.proxy_no_verify)
      }
    })()
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    setSaved(false)

    const credResp = await setCredentials(apiToken, accountId)
    if (!credResp.success) {
      setError(credResp.error?.message || '保存凭据失败')
      setSaving(false)
      return
    }
    const settingsResp = await saveSettings({
      apiToken, accountId,
      cacheSize: 1000, cacheTtl: 300, logLevel,
      proxyUrl: proxyUrl || null,
      proxyNoVerify: proxyNoVerify,
    })
    if (settingsResp.success) {
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } else if (settingsResp.error) {
      setError(settingsResp.error.message)
    }
    setSaving(false)
  }

  const handleVerify = async () => {
    if (!apiToken) { setError('请先输入 API Token'); return }
    setVerifying(true)
    setError(null)
    setVerifyError(null)
    setVerifyResult(null)

    // 先保存凭据到运行时
    const saveResp = await setCredentials(apiToken, accountId)
    if (!saveResp.success) {
      setError(saveResp.error?.message || '保存凭据失败')
      setVerifying(false)
      return
    }

    const resp = await verifyToken()
    if (resp.success && resp.data) {
      setVerifyResult(resp.data)
      if (resp.data.status !== 'active') {
        setVerifyError(`令牌状态: ${resp.data.status}`)
      }
    } else {
      setVerifyError(resp.error?.message || '验证失败，请检查令牌是否正确')
    }
    setVerifying(false)
  }

  const handleReset = () => {
    setApiToken('')
    setAccountId('')
    setLogLevel('info')
    setProxyUrl('')
    setProxyNoVerify(false)
    setError(null)
    setSaved(false)
    setVerifyResult(null)
    setVerifyError(null)
  }

  // 输入框显示值：编辑模式完整显示，非编辑模式部分掩码
  const displayToken = showToken ? apiToken : maskToken(apiToken)

  return (
    <div className="space-y-5 max-w-2xl">
      {/* Cloudflare */}
      <Card className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Cloudflare 配置</h3>
          {verifyResult && verifyResult.status === 'active' && (
            <span className="flex items-center gap-1.5 text-xs text-success">
              <CheckCircle2 className="w-3.5 h-3.5" /> 已验证
            </span>
          )}
          {verifyError && (
            <span className="flex items-center gap-1.5 text-xs text-danger">
              <XCircle className="w-3.5 h-3.5" /> {verifyError}
            </span>
          )}
        </div>
        <div className="space-y-3">
          <div>
            <Label>API Token</Label>
            <div className="relative">
              <Input
                type={showToken ? 'text' : 'text'}
                placeholder="输入 Cloudflare API Token"
                value={displayToken}
                onChange={(e) => {
                  // 如果用户在掩码模式下输入，切换到显示模式
                  if (!showToken) setShowToken(true)
                  setApiToken(e.target.value)
                }}
                onFocus={() => setShowToken(true)}
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
              >
                {showToken
                  ? <EyeOff className="w-3.5 h-3.5" />
                  : <Eye className="w-3.5 h-3.5" />
                }
              </button>
            </div>
          </div>
          <div>
            <Label>Account ID</Label>
            <Input type="text" placeholder="输入 Account ID"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)} />
          </div>
        </div>
        <div className="flex items-center gap-2 pt-1">
          <Button variant="primary" size="sm" onClick={handleVerify} disabled={verifying || !apiToken}
            icon={verifying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}>
            {verifying ? '验证中...' : '验证令牌'}
          </Button>
        </div>
      </Card>

      {/* 代理设置 */}
      <Card className="p-5 space-y-4">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Globe className="w-4 h-4 text-primary" /> 代理设置
        </h3>
        <div className="space-y-3">
          <div>
            <Label>代理地址</Label>
            <Input
              type="text"
              placeholder="例如 http://127.0.0.1:7890 或 socks5://127.0.0.1:7890"
              value={proxyUrl}
              onChange={(e) => setProxyUrl(e.target.value)}
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              支持 HTTP / HTTPS / SOCKS5 代理，留空则直连
            </p>
          </div>
          <label className="flex items-center justify-between cursor-pointer group">
            <div>
              <span className="text-sm text-foreground">跳过 TLS 证书验证</span>
              <p className="text-[10px] text-muted-foreground">用于 MITM 代理（如开启了 TLS 解密的代理），一般无需开启</p>
            </div>
            <button type="button" role="switch" aria-checked={proxyNoVerify}
              onClick={() => setProxyNoVerify(!proxyNoVerify)}
              className={`relative w-10 h-[22px] rounded-full transition-colors duration-200 flex-shrink-0 ${
                proxyNoVerify ? 'bg-warning' : 'bg-surface'
              }`}>
              <span className={`absolute top-[3px] left-[3px] w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                proxyNoVerify ? 'translate-x-[18px]' : 'translate-x-0'
              }`} />
            </button>
          </label>
        </div>
      </Card>

      {/* Token Verification Result */}
      {verifyResult && (
        <Card className="p-5 space-y-4 animate-fade-in">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Key className="w-4 h-4 text-primary" />
            令牌信息
          </h3>

          {/* Status & ID */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-surface">
              <span className={`w-2 h-2 rounded-full ${
                verifyResult.status === 'active'
                  ? 'bg-success shadow-[0_0_6px_var(--color-success)]'
                  : 'bg-danger shadow-[0_0_6px_var(--color-danger)]'
              }`} />
              <span className="text-xs text-muted-foreground">状态</span>
              <span className="text-xs font-medium text-foreground ml-auto">{verifyResult.status}</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-surface">
              <Key className="w-3 h-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">ID</span>
              <span className="text-[10px] font-mono text-foreground ml-auto truncate max-w-[140px]">{verifyResult.id}</span>
            </div>
          </div>

          {/* Expiry info */}
          {(verifyResult.expires_on || verifyResult.not_before) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {verifyResult.not_before && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-surface">
                  <Clock className="w-3 h-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">生效时间</span>
                  <span className="text-[10px] text-foreground ml-auto">{verifyResult.not_before.split('T')[0]}</span>
                </div>
              )}
              {verifyResult.expires_on && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-surface">
                  <Clock className="w-3 h-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">过期时间</span>
                  <span className="text-[10px] text-foreground ml-auto">{verifyResult.expires_on.split('T')[0]}</span>
                </div>
              )}
            </div>
          )}

          {/* Message */}
          {verifyResult.message && (
            <p className="text-[11px] text-muted-foreground px-1">{verifyResult.message}</p>
          )}

          {/* Permissions */}
          {verifyResult.permissions.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-medium text-foreground">权限列表</h4>
              {verifyResult.permissions.map((perm, idx) => (
                <div key={idx} className="px-3 py-2.5 rounded-xl bg-surface border border-border-subtle space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                      perm.effect === 'allow' ? 'bg-success-glow text-success' : 'bg-danger-glow text-danger'
                    }`}>
                      {perm.effect === 'allow' ? '允许' : '拒绝'}
                    </span>
                    <span className="text-[10px] text-muted-foreground truncate">
                      {perm.resources.map(r => r.replace('com.cloudflare.api.', '')).join(', ')}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {perm.permission_groups.map((group, gIdx) => (
                      <span key={gIdx} className="text-[10px] px-2 py-0.5 rounded-lg bg-primary-glow text-primary">
                        {group}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {verifyResult.permissions.length === 0 && verifyResult.status === 'active' && (
            <p className="text-[10px] text-muted-foreground px-1">
              无法获取权限详情（令牌可能缺少读取自身信息的权限）
            </p>
          )}
        </Card>
      )}

      {/* General */}
      <Card className="p-5 space-y-4">
        <h3 className="text-sm font-semibold text-foreground">通用设置</h3>
        <div className="space-y-3">
          <div>
            <Label>主题</Label>
            <Select value={theme} onChange={(e) => setTheme(e.target.value as 'light' | 'dark')}
              options={[{ value: 'dark', label: '深色' }, { value: 'light', label: '浅色' }]} />
          </div>
          <div>
            <Label>语言</Label>
            <Select value={language} onChange={(e) => setLanguage(e.target.value)}
              options={[{ value: 'zh-CN', label: '简体中文' }, { value: 'en', label: 'English' }]} />
          </div>
          <div>
            <Label>日志级别</Label>
            <Select value={logLevel} onChange={(e) => setLogLevel(e.target.value)}
              options={[
                { value: 'debug', label: 'Debug' },
                { value: 'info', label: 'Info' },
                { value: 'warn', label: 'Warning' },
                { value: 'error', label: 'Error' },
              ]} />
          </div>
        </div>
      </Card>

      {/* 脚本设置 */}
      <Card className="p-5 space-y-4">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Code className="w-4 h-4 text-primary" /> 脚本设置
        </h3>
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>最大脚本数量</Label>
              <Input type="number" min={1} max={100} value={maxScripts}
                onChange={(e) => setMaxScripts(Number(e.target.value))} />
            </div>
            <div>
              <Label>最大并发执行</Label>
              <Input type="number" min={1} max={10} value={scriptConcurrency}
                onChange={(e) => setScriptConcurrency(Number(e.target.value))} />
            </div>
            <div>
              <Label>内存限制 (MB)</Label>
              <Input type="number" min={1} max={256} value={scriptMemory}
                onChange={(e) => setScriptMemory(Number(e.target.value))} />
            </div>
            <div>
              <Label>执行超时 (ms)</Label>
              <Input type="number" min={1000} max={60000} step={1000} value={scriptTimeout}
                onChange={(e) => setScriptTimeout(Number(e.target.value))} />
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground">
            限制每个 Lua 脚本的资源使用，防止死循环和内存炸弹
          </p>
        </div>
      </Card>

      {/* Toggles */}
      <Card className="p-5 space-y-4">
        <h3 className="text-sm font-semibold text-foreground">功能开关</h3>
        <div className="space-y-3">
          <label className="flex items-center justify-between cursor-pointer group">
            <span className="text-sm text-foreground">开机自启</span>
            <button type="button" role="switch" aria-checked={autoStart}
              onClick={() => setAutoStart(!autoStart)}
              className={`relative w-10 h-[22px] rounded-full transition-colors duration-200 ${
                autoStart ? 'bg-primary' : 'bg-surface'
              }`}>
              <span className={`absolute top-[3px] left-[3px] w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                autoStart ? 'translate-x-[18px]' : 'translate-x-0'
              }`} />
            </button>
          </label>
          <label className="flex items-center justify-between cursor-pointer group">
            <span className="text-sm text-foreground">系统通知</span>
            <button type="button" role="switch" aria-checked={notifications}
              onClick={() => setNotifications(!notifications)}
              className={`relative w-10 h-[22px] rounded-full transition-colors duration-200 ${
                notifications ? 'bg-primary' : 'bg-surface'
              }`}>
              <span className={`absolute top-[3px] left-[3px] w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                notifications ? 'translate-x-[18px]' : 'translate-x-0'
              }`} />
            </button>
          </label>
        </div>
      </Card>

      {/* 错误 */}
      {error && (
        <div className="px-4 py-3 bg-danger-glow border border-border-subtle rounded-xl animate-slide-down">
          <p className="text-danger text-xs">{error}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3">
        <Button variant="primary" size="sm" onClick={handleSave} disabled={saving}
          icon={saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}>
          {saved ? '已保存 ✓' : saving ? '保存中...' : '保存设置'}
        </Button>
        <Button variant="ghost" size="sm" onClick={handleReset}
          icon={<RotateCcw className="w-3.5 h-3.5" />}>
          重置
        </Button>
      </div>
    </div>
  )
}
