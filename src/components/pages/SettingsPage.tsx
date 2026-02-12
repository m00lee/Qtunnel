'use client'

import { useState, useEffect } from 'react'
import {
  Save, RotateCcw, ShieldCheck, Loader2, Eye, EyeOff,
  CheckCircle2, XCircle, Key, Code, Globe,
} from 'lucide-react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Label from '@/components/ui/Label'
import Select from '@/components/ui/Select'
import Switch from '@/components/ui/Switch'
import { useAppStore } from '@/lib/store'
import { loadSettings, setCredentials, saveSettings, verifyToken, type TokenVerifyResult } from '@/lib/api'
import { toast } from '@/lib/toast'

function maskToken(token: string): string {
  if (!token) return ''
  if (token.length <= 12) return token.substring(0, 2) + '••••' + token.substring(token.length - 2)
  return token.substring(0, 8) + '••••••••' + token.substring(token.length - 4)
}

export default function SettingsPage() {
  const { theme, setTheme, density, setDensity } = useAppStore()
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
  const [verifying, setVerifying] = useState(false)
  const [verifyResult, setVerifyResult] = useState<TokenVerifyResult | null>(null)
  const [verifyError, setVerifyError] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      const resp = await loadSettings()
      if (resp.success && resp.data) {
        const c = resp.data
        if (c.cf_api_token) setApiToken(c.cf_api_token)
        if (c.cf_account_id) setAccountId(c.cf_account_id)
        if (c.log_level) setLogLevel(c.log_level)
        if (c.proxy_url) setProxyUrl(c.proxy_url)
        if (c.proxy_no_verify) setProxyNoVerify(c.proxy_no_verify)
      }
    })()
  }, [])

  const handleSave = async () => {
    setSaving(true)
    const credResp = await setCredentials(apiToken, accountId)
    if (!credResp.success) { toast.error(credResp.error?.message || '保存凭据失败'); setSaving(false); return }
    const settingsResp = await saveSettings({
      apiToken, accountId, cacheSize: 1000, cacheTtl: 300, logLevel,
      proxyUrl: proxyUrl || null, proxyNoVerify,
    })
    if (settingsResp.success) toast.success('设置已保存')
    else if (settingsResp.error) toast.error(settingsResp.error.message)
    setSaving(false)
  }

  const handleVerify = async () => {
    if (!apiToken) { toast.warning('请先输入 API Token'); return }
    setVerifying(true); setVerifyError(null); setVerifyResult(null)
    const saveResp = await setCredentials(apiToken, accountId)
    if (!saveResp.success) { toast.error(saveResp.error?.message || '保存凭据失败'); setVerifying(false); return }
    const resp = await verifyToken()
    if (resp.success && resp.data) {
      setVerifyResult(resp.data)
      if (resp.data.status === 'active') toast.success('令牌验证通过')
      else { setVerifyError(`令牌状态: ${resp.data.status}`); toast.warning(`令牌状态: ${resp.data.status}`) }
    } else { setVerifyError(resp.error?.message || '验证失败'); toast.error(resp.error?.message || '验证失败') }
    setVerifying(false)
  }

  const handleReset = () => {
    setApiToken(''); setAccountId(''); setLogLevel('info')
    setProxyUrl(''); setProxyNoVerify(false)
    setVerifyResult(null); setVerifyError(null)
    toast.info('设置已重置')
  }

  const displayToken = showToken ? apiToken : maskToken(apiToken)

  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Left column */}
        <div className="space-y-6">
      {/* Cloudflare */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-fg">Cloudflare 配置</h2>
          {verifyResult && verifyResult.status === 'active' && (
            <span className="flex items-center gap-1 text-xs text-success"><CheckCircle2 className="w-3 h-3" /> 已验证</span>
          )}
          {verifyError && (
            <span className="flex items-center gap-1 text-xs text-danger"><XCircle className="w-3 h-3" /> {verifyError}</span>
          )}
        </div>
        <Card className="p-4 space-y-3">
          <div>
            <Label>API Token</Label>
            <div className="relative">
              <Input type="text" placeholder="输入 Cloudflare API Token" value={displayToken}
                onChange={(e) => { if (!showToken) setShowToken(true); setApiToken(e.target.value) }}
                onFocus={() => setShowToken(true)} />
              <button type="button" onClick={() => setShowToken(!showToken)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded text-fg-3 hover:text-fg transition-colors">
                {showToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
          <div>
            <Label>Account ID</Label>
            <Input type="text" placeholder="输入 Account ID" value={accountId}
              onChange={(e) => setAccountId(e.target.value)} />
          </div>
          <Button variant="primary" size="sm" onClick={handleVerify} disabled={verifying || !apiToken}
            icon={verifying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}>
            {verifying ? '验证中...' : '验证令牌'}
          </Button>
        </Card>
      </section>

      {/* Proxy */}
      <section>
        <h2 className="text-sm font-semibold text-fg mb-3 flex items-center gap-1.5">
          <Globe className="w-3.5 h-3.5 text-primary" /> 代理设置
        </h2>
        <Card className="p-4 space-y-3">
          <div>
            <Label>代理地址</Label>
            <Input type="text" placeholder="http://127.0.0.1:7890" value={proxyUrl}
              onChange={(e) => setProxyUrl(e.target.value)} />
            <p className="text-xs text-fg-3 mt-1">支持 HTTP / HTTPS / SOCKS5，留空则直连</p>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm text-fg">跳过 TLS 验证</span>
              <p className="text-xs text-fg-3">用于 MITM 代理</p>
            </div>
            <Switch checked={proxyNoVerify} onChange={setProxyNoVerify} />
          </div>
        </Card>
      </section>
        </div>

        {/* Right column */}
        <div className="space-y-6">

      {/* General */}
      <section>
        <h2 className="text-sm font-semibold text-fg mb-3">通用设置</h2>
        <Card className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>主题</Label><Select value={theme} onChange={(e) => setTheme(e.target.value as 'light' | 'dark')}
              options={[{ value: 'dark', label: '深色' }, { value: 'light', label: '浅色' }]} /></div>
            <div><Label>密度</Label><Select value={density} onChange={(e) => setDensity(e.target.value as 'comfortable' | 'compact')}
              options={[{ value: 'comfortable', label: '舒适' }, { value: 'compact', label: '紧凑' }]} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>语言</Label><Select value={language} onChange={(e) => setLanguage(e.target.value)}
              options={[{ value: 'zh-CN', label: '简体中文' }, { value: 'en', label: 'English' }]} /></div>
            <div><Label>日志级别</Label><Select value={logLevel} onChange={(e) => setLogLevel(e.target.value)}
              options={[{ value: 'debug', label: 'Debug' }, { value: 'info', label: 'Info' }, { value: 'warn', label: 'Warning' }, { value: 'error', label: 'Error' }]} /></div>
          </div>
          <div className="flex items-center justify-between pt-1">
            <span className="text-sm text-fg">开机自启</span>
            <Switch checked={autoStart} onChange={setAutoStart} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-fg">系统通知</span>
            <Switch checked={notifications} onChange={setNotifications} />
          </div>
        </Card>
      </section>

      {/* Script settings */}
      <section>
        <h2 className="text-sm font-semibold text-fg mb-3 flex items-center gap-1.5">
          <Code className="w-3.5 h-3.5 text-primary" /> 脚本设置
        </h2>
        <Card className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>最大脚本数</Label><Input type="number" min={1} max={100} value={maxScripts} onChange={(e) => setMaxScripts(Number(e.target.value))} /></div>
            <div><Label>最大并发</Label><Input type="number" min={1} max={10} value={scriptConcurrency} onChange={(e) => setScriptConcurrency(Number(e.target.value))} /></div>
            <div><Label>内存限制 (MB)</Label><Input type="number" min={1} max={256} value={scriptMemory} onChange={(e) => setScriptMemory(Number(e.target.value))} /></div>
            <div><Label>超时 (ms)</Label><Input type="number" min={1000} max={60000} step={1000} value={scriptTimeout} onChange={(e) => setScriptTimeout(Number(e.target.value))} /></div>
          </div>
          <p className="text-xs text-fg-3">限制每个 Lua 脚本的资源使用</p>
        </Card>
      </section>
        </div>
      </div>

      {/* Token info — full width */}
      {verifyResult && (
        <section className="animate-fade-in">
          <h2 className="text-sm font-semibold text-fg mb-3 flex items-center gap-1.5">
            <Key className="w-3.5 h-3.5 text-primary" /> 令牌信息
          </h2>
          <Card className="p-4 space-y-3">
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 text-xs">
              <div className="flex items-center justify-between p-2 rounded-md bg-surface-1">
                <span className="text-fg-2">状态</span>
                <span className="text-fg font-medium">{verifyResult.status}</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-md bg-surface-1">
                <span className="text-fg-2">ID</span>
                <span className="text-fg font-mono truncate ml-2">{verifyResult.id}</span>
              </div>
              {verifyResult.not_before && (
                <div className="flex items-center justify-between p-2 rounded-md bg-surface-1">
                  <span className="text-fg-2">生效</span>
                  <span className="text-fg">{verifyResult.not_before.split('T')[0]}</span>
                </div>
              )}
              {verifyResult.expires_on && (
                <div className="flex items-center justify-between p-2 rounded-md bg-surface-1">
                  <span className="text-fg-2">过期</span>
                  <span className="text-fg">{verifyResult.expires_on.split('T')[0]}</span>
                </div>
              )}
            </div>
            {verifyResult.permissions.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-medium text-fg">权限</span>
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-2">
                  {verifyResult.permissions.map((perm, idx) => (
                    <div key={idx} className="p-2 rounded-md bg-surface-1 space-y-1.5 text-xs">
                      <div className="flex items-center gap-2">
                        <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${perm.effect === 'allow' ? 'bg-success-tint text-success' : 'bg-danger-tint text-danger'}`}>
                          {perm.effect === 'allow' ? '允许' : '拒绝'}
                        </span>
                        <span className="text-fg-2 truncate">{perm.resources.map((r) => r.replace('com.cloudflare.api.', '')).join(', ')}</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {perm.permission_groups.map((g, gi) => (
                          <span key={gi} className="px-1.5 py-0.5 rounded bg-primary-tint text-primary text-xs">{g}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </section>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Button variant="primary" size="sm" onClick={handleSave} disabled={saving}
          icon={saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}>
          {saving ? '保存中...' : '保存设置'}
        </Button>
        <Button variant="ghost" size="sm" onClick={handleReset} icon={<RotateCcw className="w-3.5 h-3.5" />}>
          重置
        </Button>
      </div>
    </div>
  )
}
