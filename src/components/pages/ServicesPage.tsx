'use client'

import { useState, useEffect, useCallback } from 'react'
import { Zap, Search, RefreshCw, Trash2, ArrowRight, Globe, Server } from 'lucide-react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import QuickBindModal from '@/components/modals/QuickBindModal'
import { listTunnels, getTunnelConfig, unbindIngress, type Tunnel, type IngressRule } from '@/lib/api'
import { toast } from '@/lib/toast'

export default function ServicesPage() {
  const [showBindModal, setShowBindModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [tunnels, setTunnels] = useState<{ value: string; label: string }[]>([])
  const [selectedTunnel, setSelectedTunnel] = useState('')
  const [ingress, setIngress] = useState<IngressRule[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    ;(async () => {
      const resp = await listTunnels()
      if (resp.success && resp.data) {
        const opts = resp.data.map((t: Tunnel) => ({ value: t.id, label: t.name }))
        setTunnels(opts)
        if (opts.length > 0 && !selectedTunnel) setSelectedTunnel(opts[0].value)
      }
    })()
  }, [])

  const fetchConfig = useCallback(async () => {
    if (!selectedTunnel) return
    setLoading(true)
    const resp = await getTunnelConfig(selectedTunnel)
    if (resp.success && resp.data) setIngress(resp.data)
    else if (resp.error) { toast.error(resp.error.message); setIngress([]) }
    setLoading(false)
  }, [selectedTunnel])

  useEffect(() => { fetchConfig() }, [fetchConfig])

  const handleUnbind = async (hostname: string) => {
    if (!selectedTunnel) return
    const resp = await unbindIngress(selectedTunnel, hostname)
    if (resp.success) { toast.success(`已解绑 ${hostname}`); fetchConfig() }
    else if (resp.error) toast.error(resp.error.message)
  }

  const services = ingress.filter((r) => r.hostname)
  const filtered = services.filter((r) =>
    (r.hostname || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.service.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-semibold text-fg">本地服务</h1>
          <p className="text-xs text-fg-2 mt-0.5">{services.length} 个已绑定服务</p>
        </div>
        <Button variant="primary" size="sm" onClick={() => setShowBindModal(true)} disabled={!selectedTunnel}
          icon={<Zap className="w-3.5 h-3.5" />}>
          一键绑定
        </Button>
      </div>

      {/* Tunnel select + refresh */}
      <div className="flex items-center gap-2">
        <div className="flex-1 max-w-xs">
          <Select value={selectedTunnel} onChange={(e) => setSelectedTunnel(e.target.value)}
            options={tunnels.length > 0 ? tunnels : [{ value: '', label: '暂无隧道' }]} />
        </div>
        <Button variant="ghost" size="sm" onClick={fetchConfig} disabled={loading}
          icon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />} />
      </div>

      {/* Search */}
      {services.length > 0 && (
        <Input type="text" placeholder="搜索服务..." value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          leftIcon={<Search className="w-3.5 h-3.5" />} />
      )}

      {/* Service list */}
      {filtered.length > 0 ? (
        <div className="space-y-1">
          {filtered.map((rule, idx) => (
            <div key={rule.hostname || idx} className="flex items-center h-row px-3 rounded-md hover:bg-surface-1 transition-colors group">
              <Globe className="w-4 h-4 text-primary flex-shrink-0 mr-2" />
              <span className="text-sm text-fg truncate flex-1">{rule.hostname}</span>
              <ArrowRight className="w-3 h-3 text-fg-3 mx-2" />
              <div className="flex items-center gap-1.5 min-w-0">
                <Server className="w-3 h-3 text-success flex-shrink-0" />
                <span className="text-xs font-mono text-success truncate">{rule.service}</span>
              </div>
              <button onClick={() => rule.hostname && handleUnbind(rule.hostname)}
                className="p-1.5 rounded-md text-fg-3 hover:text-danger hover:bg-danger-tint transition-colors ml-2 opacity-0 group-hover:opacity-100">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
          {ingress.some((r) => !r.hostname) && (
            <div className="flex items-center h-row px-3 text-xs text-fg-3">
              <span className="mr-2">*</span>
              默认: {ingress.find((r) => !r.hostname)?.service || 'http_status:404'}
            </div>
          )}
        </div>
      ) : !loading ? (
        <Card className="py-12 text-center">
          <Zap className="w-8 h-8 text-fg-3 mx-auto mb-2" />
          <p className="text-sm text-fg">暂无服务绑定</p>
          <p className="text-xs text-fg-2 mt-1">点击「一键绑定」映射本地端口到域名</p>
        </Card>
      ) : null}

      <QuickBindModal isOpen={showBindModal} onClose={() => setShowBindModal(false)} onSuccess={fetchConfig} preselectedTunnelId={selectedTunnel} />
    </div>
  )
}
