'use client'

import { useState, useEffect } from 'react'
import { X, Zap, Globe, Server } from 'lucide-react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import { listZones, listTunnels, quickBind, type Zone, type Tunnel } from '@/lib/api'

interface QuickBindModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  preselectedTunnelId?: string
}

const PROTOCOLS = [
  { value: 'http', label: 'HTTP' },
  { value: 'https', label: 'HTTPS' },
  { value: 'tcp', label: 'TCP' },
  { value: 'ssh', label: 'SSH' },
  { value: 'rdp', label: 'RDP' },
]

export default function QuickBindModal({ isOpen, onClose, onSuccess, preselectedTunnelId }: QuickBindModalProps) {
  const [tunnels, setTunnels] = useState<Tunnel[]>([])
  const [zones, setZones] = useState<Zone[]>([])
  const [tunnelId, setTunnelId] = useState(preselectedTunnelId || '')
  const [zoneId, setZoneId] = useState('')
  const [subdomain, setSubdomain] = useState('')
  const [protocol, setProtocol] = useState('http')
  const [localPort, setLocalPort] = useState('8080')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return
    setError(null); setSuccess(null)
    if (preselectedTunnelId) setTunnelId(preselectedTunnelId)
    ;(async () => {
      const [tResp, zResp] = await Promise.all([listTunnels(), listZones()])
      if (tResp.success && tResp.data) setTunnels(tResp.data)
      if (zResp.success && zResp.data) setZones(zResp.data)
      else if (zResp.error) setError('无法加载域名列表: ' + zResp.error.message)
    })()
  }, [isOpen, preselectedTunnelId])

  const selectedZone = zones.find(z => z.id === zoneId)
  const fullHostname = subdomain
    ? `${subdomain}.${selectedZone?.name || '???'}`
    : selectedZone?.name || ''

  const handleSubmit = async () => {
    if (!tunnelId || !zoneId || !localPort) return
    setLoading(true); setError(null); setSuccess(null)
    const port = parseInt(localPort, 10)
    if (isNaN(port) || port < 1 || port > 65535) {
      setError('端口范围 1-65535'); setLoading(false); return
    }
    const resp = await quickBind(tunnelId, zoneId, selectedZone?.name || '', subdomain, protocol, port)
    if (resp.success && resp.data) {
      setSuccess(`已绑定 ${resp.data.hostname} → ${resp.data.service}`)
      setTimeout(() => { onSuccess(); onClose() }, 1200)
    } else if (resp.error) {
      setError(resp.error.message)
    }
    setLoading(false)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-2xl shadow-elevated w-full max-w-lg animate-scale-in overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary-glow flex items-center justify-center">
              <Zap className="w-4 h-4 text-primary" />
            </div>
            <h2 className="text-base font-semibold text-foreground">一键绑定服务</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface transition-colors">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Tunnel 选择 */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5" />隧道
            </label>
            <Select
              value={tunnelId}
              onChange={(e) => setTunnelId(e.target.value)}
              options={[
                { value: '', label: '请选择隧道...' },
                ...tunnels.map(t => ({ value: t.id, label: `${t.name} (${t.status})` })),
              ]}
            />
          </div>

          {/* Zone 选择 */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5" />域名
            </label>
            <Select
              value={zoneId}
              onChange={(e) => setZoneId(e.target.value)}
              options={[
                { value: '', label: zones.length > 0 ? '请选择域名...' : '加载中...' },
                ...zones.map(z => ({ value: z.id, label: z.name })),
              ]}
            />
          </div>

          {/* Subdomain + Protocol + Port */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">子域名前缀</label>
              <Input
                type="text"
                placeholder="api"
                value={subdomain}
                onChange={(e) => setSubdomain(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">协议</label>
              <Select
                value={protocol}
                onChange={(e) => setProtocol(e.target.value)}
                options={PROTOCOLS}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">本地端口</label>
              <Input
                type="number"
                placeholder="8080"
                value={localPort}
                onChange={(e) => setLocalPort(e.target.value)}
              />
            </div>
          </div>

          {/* Preview */}
          {zoneId && (
            <div className="p-3 bg-surface rounded-xl border border-border-subtle text-xs space-y-1">
              <p className="text-muted-foreground">绑定预览:</p>
              <p className="text-foreground font-mono">
                <span className="text-primary">{fullHostname}</span>
                {' → '}
                <span className="text-success">{protocol}://localhost:{localPort || '?'}</span>
              </p>
              <p className="text-muted-foreground">
                DNS: CNAME → <span className="font-mono">{tunnelId ? `${tunnelId.substring(0,8)}...cfargotunnel.com` : '?'}</span>
              </p>
            </div>
          )}

          {/* Error / Success */}
          {error && (
            <div className="px-3 py-2 bg-danger-glow border border-border-subtle rounded-xl">
              <p className="text-danger text-xs">{error}</p>
            </div>
          )}
          {success && (
            <div className="px-3 py-2 bg-success-glow border border-border-subtle rounded-xl">
              <p className="text-success text-xs">{success}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-border-subtle">
          <Button variant="ghost" size="sm" onClick={onClose}>取消</Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSubmit}
            disabled={loading || !tunnelId || !zoneId || !localPort}
            icon={<Zap className="w-3.5 h-3.5" />}
          >
            {loading ? '绑定中...' : '一键绑定'}
          </Button>
        </div>
      </div>
    </div>
  )
}
