'use client'

import { useState, useEffect, useCallback } from 'react'
import { Zap, Search, RefreshCw, Trash2, ArrowRight, Globe, Server } from 'lucide-react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import QuickBindModal from '@/components/modals/QuickBindModal'
import { listTunnels, getTunnelConfig, unbindIngress, type Tunnel, type IngressRule } from '@/lib/api'

export default function ServicesPage() {
  const [showBindModal, setShowBindModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [tunnels, setTunnels] = useState<{ value: string; label: string }[]>([])
  const [selectedTunnel, setSelectedTunnel] = useState('')
  const [ingress, setIngress] = useState<IngressRule[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
    setLoading(true); setError(null)
    const resp = await getTunnelConfig(selectedTunnel)
    if (resp.success && resp.data) {
      setIngress(resp.data)
    } else if (resp.error) {
      setError(resp.error.message)
      setIngress([])
    }
    setLoading(false)
  }, [selectedTunnel])

  useEffect(() => { fetchConfig() }, [fetchConfig])

  const handleUnbind = async (hostname: string) => {
    if (!selectedTunnel) return
    setError(null)
    const resp = await unbindIngress(selectedTunnel, hostname)
    if (resp.success) {
      fetchConfig()
    } else if (resp.error) {
      setError(resp.error.message)
    }
  }

  // 只显示有 hostname 的规则（排除 catch-all）
  const services = ingress.filter(r => r.hostname)
  const filtered = services.filter(r =>
    (r.hostname || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.service.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-5">
      {/* 统计概览 */}
      {services.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Card className="p-3 text-center">
            <p className="text-lg font-bold text-foreground">{services.length}</p>
            <p className="text-[10px] text-muted-foreground">已绑定服务</p>
          </Card>
          <Card className="p-3 text-center">
            <p className="text-lg font-bold text-primary">
              {services.filter(r => r.service.startsWith('http')).length}
            </p>
            <p className="text-[10px] text-muted-foreground">HTTP 服务</p>
          </Card>
          <Card className="p-3 text-center hidden sm:block">
            <p className="text-lg font-bold text-success">
              {services.filter(r => r.service.includes('tcp') || r.service.includes('ssh') || r.service.includes('rdp')).length}
            </p>
            <p className="text-[10px] text-muted-foreground">TCP 服务</p>
          </Card>
        </div>
      )}

      {/* 隧道选择 + 操作 */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="flex-1">
          <Select
            value={selectedTunnel}
            onChange={(e) => setSelectedTunnel(e.target.value)}
            options={tunnels.length > 0 ? tunnels : [{ value: '', label: '暂无隧道' }]}
          />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={fetchConfig} disabled={loading}
            icon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />} />
          <Button variant="primary" size="sm" onClick={() => setShowBindModal(true)}
            disabled={!selectedTunnel} icon={<Zap className="w-3.5 h-3.5" />}>
            一键绑定
          </Button>
        </div>
      </div>

      {/* 搜索 */}
      {services.length > 0 && (
        <Input type="text" placeholder="搜索服务..." value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          leftIcon={<Search className="w-3.5 h-3.5" />} />
      )}

      {/* 错误 */}
      {error && (
        <div className="px-4 py-3 bg-danger-glow border border-border-subtle rounded-xl animate-slide-down">
          <p className="text-danger text-xs">{error}</p>
        </div>
      )}

      {/* Ingress 规则列表 */}
      {filtered.length > 0 ? (
        <div className="space-y-2">
          {filtered.map((rule, idx) => (
            <Card key={rule.hostname || idx} hover className="p-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                {/* 左侧：hostname → service */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-primary-glow flex items-center justify-center flex-shrink-0">
                    <Globe className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 min-w-0 flex-1">
                    <span className="text-sm font-semibold text-foreground truncate">{rule.hostname}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground hidden sm:block flex-shrink-0" />
                    <div className="flex items-center gap-1.5">
                      <Server className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                      <span className="text-xs font-mono text-success truncate">{rule.service}</span>
                    </div>
                  </div>
                </div>
                {/* 右侧：操作 */}
                <Button variant="ghost" size="sm"
                  onClick={() => rule.hostname && handleUnbind(rule.hostname)}
                  icon={<Trash2 className="w-3.5 h-3.5 text-danger" />}
                />
              </div>
            </Card>
          ))}
          {/* Catch-all 显示 */}
          {ingress.some(r => !r.hostname) && (
            <Card className="p-3 opacity-50">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-lg bg-surface flex items-center justify-center">
                  <span className="text-[10px] text-muted-foreground">*</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  默认 (catch-all): {ingress.find(r => !r.hostname)?.service || 'http_status:404'}
                </span>
              </div>
            </Card>
          )}
        </div>
      ) : !loading ? (
        <Card className="py-16 text-center">
          <div className="space-y-3">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-surface flex items-center justify-center">
              <Zap className="w-6 h-6 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">暂无服务绑定</p>
              <p className="text-xs text-muted-foreground mt-1">
                点击「一键绑定」将本地端口映射到域名
              </p>
            </div>
          </div>
        </Card>
      ) : null}

      <QuickBindModal
        isOpen={showBindModal}
        onClose={() => setShowBindModal(false)}
        onSuccess={fetchConfig}
        preselectedTunnelId={selectedTunnel}
      />
    </div>
  )
}
