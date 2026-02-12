'use client'

import { useState, useEffect, useCallback } from 'react'
import { Lock, Shield, Zap, Loader2 } from 'lucide-react'
import Card from '@/components/ui/Card'
import Select from '@/components/ui/Select'
import Button from '@/components/ui/Button'
import { getZoneSettings, updateZoneSetting, type ZoneSetting } from '@/lib/api'
import { toast } from '@/lib/toast'

interface Props { zoneId: string }

const SSL_MODES = [
  { value: 'off', label: '关闭 (不推荐)' },
  { value: 'flexible', label: 'Flexible' },
  { value: 'full', label: 'Full' },
  { value: 'strict', label: 'Full (Strict)' },
]

const TLS_VERSIONS = [
  { value: '1.0', label: 'TLS 1.0+' },
  { value: '1.1', label: 'TLS 1.1+' },
  { value: '1.2', label: 'TLS 1.2+ (推荐)' },
  { value: '1.3', label: 'TLS 1.3' },
]

const SECURITY_LEVELS = [
  { value: 'essentially_off', label: '基本关闭' },
  { value: 'low', label: '低' },
  { value: 'medium', label: '中' },
  { value: 'high', label: '高' },
  { value: 'under_attack', label: 'I\'m Under Attack' },
]

const BROWSER_CACHE_TTLS = [
  { value: '0', label: '遵循源站' },
  { value: '1800', label: '30 分钟' },
  { value: '3600', label: '1 小时' },
  { value: '7200', label: '2 小时' },
  { value: '14400', label: '4 小时' },
  { value: '28800', label: '8 小时' },
  { value: '86400', label: '1 天' },
  { value: '172800', label: '2 天' },
  { value: '604800', label: '1 周' },
  { value: '2592000', label: '1 月' },
  { value: '31536000', label: '1 年' },
]

export default function ZoneSettings({ zoneId }: Props) {
  const [settings, setSettings] = useState<Record<string, ZoneSetting>>({})
  const [loading, setLoading] = useState(false)
  const [updating, setUpdating] = useState<string | null>(null)

  const fetchSettings = useCallback(async () => {
    setLoading(true)
    const resp = await getZoneSettings(zoneId)
    if (resp.success && resp.data) {
      const map: Record<string, ZoneSetting> = {}
      resp.data.forEach((s) => { map[s.id] = s })
      setSettings(map)
    } else if (resp.error) toast.error(resp.error.message)
    setLoading(false)
  }, [zoneId])

  useEffect(() => { fetchSettings() }, [fetchSettings])

  const handleUpdate = async (id: string, value: unknown) => {
    setUpdating(id)
    const resp = await updateZoneSetting(zoneId, id, value)
    if (resp.success && resp.data) {
      setSettings((prev) => ({ ...prev, [id]: resp.data! }))
      toast.success(`设置已更新`)
    } else if (resp.error) toast.error(resp.error.message)
    setUpdating(null)
  }

  const getVal = (id: string): unknown => settings[id]?.value ?? null
  const isEditable = (id: string): boolean => settings[id]?.editable ?? false

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="w-5 h-5 animate-spin text-fg-3" /></div>

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      {/* SSL/TLS */}
      <Card className="p-4 space-y-4">
        <div className="flex items-center gap-2">
          <Lock className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-fg">SSL/TLS</span>
        </div>

        <SettingRow label="加密模式" desc="控制 Cloudflare 与源站之间的加密方式">
          <Select value={String(getVal('ssl') || 'full')} onChange={(e) => handleUpdate('ssl', e.target.value)}
            options={SSL_MODES} disabled={!isEditable('ssl') || updating === 'ssl'} />
        </SettingRow>

        <SettingRow label="最低 TLS 版本" desc="访客必须使用的最低 TLS 版本">
          <Select value={String(getVal('min_tls_version') || '1.0')} onChange={(e) => handleUpdate('min_tls_version', e.target.value)}
            options={TLS_VERSIONS} disabled={!isEditable('min_tls_version') || updating === 'min_tls_version'} />
        </SettingRow>

        <ToggleRow label="始终使用 HTTPS" desc="将所有 HTTP 请求重定向到 HTTPS"
          checked={getVal('always_use_https') === 'on'}
          disabled={!isEditable('always_use_https') || updating === 'always_use_https'}
          onToggle={(v) => handleUpdate('always_use_https', v ? 'on' : 'off')} />

        <ToggleRow label="自动 HTTPS Rewrites" desc="修复页面中的混合内容链接"
          checked={getVal('automatic_https_rewrites') === 'on'}
          disabled={!isEditable('automatic_https_rewrites') || updating === 'automatic_https_rewrites'}
          onToggle={(v) => handleUpdate('automatic_https_rewrites', v ? 'on' : 'off')} />
      </Card>

      {/* 安全 */}
      <Card className="p-4 space-y-4">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-warning" />
          <span className="text-sm font-medium text-fg">安全</span>
        </div>

        <SettingRow label="安全级别" desc="Cloudflare 对恶意流量的检测严格程度">
          <Select value={String(getVal('security_level') || 'medium')} onChange={(e) => handleUpdate('security_level', e.target.value)}
            options={SECURITY_LEVELS} disabled={!isEditable('security_level') || updating === 'security_level'} />
        </SettingRow>

        <SettingRow label="浏览器缓存 TTL" desc="Cloudflare 指示浏览器缓存资源的时长">
          <Select value={String(typeof getVal('browser_cache_ttl') === 'number' ? getVal('browser_cache_ttl') : '14400')}
            onChange={(e) => handleUpdate('browser_cache_ttl', parseInt(e.target.value, 10))}
            options={BROWSER_CACHE_TTLS} disabled={!isEditable('browser_cache_ttl') || updating === 'browser_cache_ttl'} />
        </SettingRow>
      </Card>

      {/* 性能 */}
      <Card className="p-4 space-y-4 xl:col-span-2">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-success" />
          <span className="text-sm font-medium text-fg">性能优化</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <ToggleRow label="Brotli 压缩" desc="对响应进行 Brotli 压缩"
            checked={getVal('brotli') === 'on'}
            disabled={!isEditable('brotli') || updating === 'brotli'}
            onToggle={(v) => handleUpdate('brotli', v ? 'on' : 'off')} />

          <ToggleRow label="Early Hints" desc="在主请求前发送 103 Early Hints"
            checked={getVal('early_hints') === 'on'}
            disabled={!isEditable('early_hints') || updating === 'early_hints'}
            onToggle={(v) => handleUpdate('early_hints', v ? 'on' : 'off')} />

          <MinifyRow value={getVal('minify')} editable={isEditable('minify')}
            disabled={updating === 'minify'} onUpdate={(v) => handleUpdate('minify', v)} />
        </div>
      </Card>
    </div>
  )
}

function SettingRow({ label, desc, children }: { label: string; desc: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="text-xs font-medium text-fg">{label}</p>
        <p className="text-xs text-fg-3 mt-0.5">{desc}</p>
      </div>
      <div className="w-44 flex-shrink-0">{children}</div>
    </div>
  )
}

function ToggleRow({ label, desc, checked, disabled, onToggle }: {
  label: string; desc: string; checked: boolean; disabled: boolean; onToggle: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="text-xs font-medium text-fg">{label}</p>
        <p className="text-xs text-fg-3 mt-0.5">{desc}</p>
      </div>
      <button
        onClick={() => onToggle(!checked)}
        disabled={disabled}
        className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
          checked ? 'bg-primary' : 'bg-surface-2'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform mt-0.5 ${
          checked ? 'translate-x-[18px]' : 'translate-x-0.5'
        }`} />
      </button>
    </div>
  )
}

function MinifyRow({ value, editable, disabled, onUpdate }: {
  value: unknown; editable: boolean; disabled: boolean; onUpdate: (v: unknown) => void
}) {
  const v = (value as { js?: string; css?: string; html?: string } | null) || {}
  const jsOn = v.js === 'on'
  const cssOn = v.css === 'on'
  const htmlOn = v.html === 'on'

  const toggle = (key: 'js' | 'css' | 'html') => {
    const current = { js: v.js || 'off', css: v.css || 'off', html: v.html || 'off' }
    current[key] = current[key] === 'on' ? 'off' : 'on'
    onUpdate(current)
  }

  return (
    <div className="space-y-2">
      <div>
        <p className="text-xs font-medium text-fg">自动压缩</p>
        <p className="text-xs text-fg-3 mt-0.5">压缩 JS / CSS / HTML</p>
      </div>
      <div className="flex gap-2">
        {(['js', 'css', 'html'] as const).map((k) => {
          const on = k === 'js' ? jsOn : k === 'css' ? cssOn : htmlOn
          return (
            <Button key={k} variant={on ? 'primary' : 'ghost'} size="sm"
              disabled={!editable || disabled} onClick={() => toggle(k)}>
              {k.toUpperCase()}
            </Button>
          )
        })}
      </div>
    </div>
  )
}
