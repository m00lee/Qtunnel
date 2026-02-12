'use client'

import { useState, useEffect } from 'react'
import { Globe, Server, ArrowRight, Activity, Monitor, Loader2, ChevronDown, ChevronRight } from 'lucide-react'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import { listTunnels, getTunnelConfig, type Tunnel, type IngressRule } from '@/lib/api'

interface TunnelTopologyData { tunnel: Tunnel; ingress: IngressRule[]; loading: boolean }

export default function TunnelTopology() {
  const [data, setData] = useState<TunnelTopologyData[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      const resp = await listTunnels()
      if (!resp.success || !resp.data) { setLoading(false); return }
      const tunnelList = resp.data
      setData(tunnelList.map((t) => ({ tunnel: t, ingress: [], loading: true })))
      setLoading(false)
      setExpanded(new Set(tunnelList.map((t) => t.id)))
      const updated = await Promise.all(
        tunnelList.map(async (t) => {
          const cfgResp = await getTunnelConfig(t.id)
          return { tunnel: t, ingress: cfgResp.success && cfgResp.data ? (cfgResp.data as IngressRule[]) : [], loading: false }
        }),
      )
      setData(updated)
    })()
  }, [])

  const toggle = (id: string) => setExpanded((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })

  const statusVariant = (s: string): 'success' | 'warning' | 'default' => {
    if (s === 'healthy') return 'success'
    if (s === 'inactive') return 'default'
    return 'warning'
  }

  const parseService = (svc: string) => {
    const m = svc.match(/^(https?|tcp|ssh|rdp|unix):\/\/(.+)/)
    return m ? { protocol: m[1].toUpperCase(), target: m[2] } : { protocol: '', target: svc }
  }

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="w-4 h-4 animate-spin text-fg-3" /></div>
  if (data.length === 0) return <Card className="py-8 text-center"><Activity className="w-6 h-6 text-fg-3 mx-auto mb-2" /><p className="text-xs text-fg-3">暂无数据</p></Card>

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-4 text-xs text-fg-3 px-1">
        <span className="flex items-center gap-1"><Globe className="w-3 h-3 text-primary" /> Edge</span>
        <span className="flex items-center gap-1"><Activity className="w-3 h-3 text-warning" /> 隧道</span>
        <span className="flex items-center gap-1"><Monitor className="w-3 h-3 text-success" /> 本地服务</span>
      </div>

      {data.map(({ tunnel, ingress, loading: cfgLoading }) => {
        const isExpanded = expanded.has(tunnel.id)
        const rules = ingress.filter((r) => !!r.hostname)
        return (
          <Card key={tunnel.id} className="overflow-hidden">
            <button className="w-full flex items-center gap-3 p-3 hover:bg-surface-1 transition-colors text-left" onClick={() => toggle(tunnel.id)}>
              {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-fg-3" /> : <ChevronRight className="w-3.5 h-3.5 text-fg-3" />}
              <div className="w-6 h-6 rounded-md bg-primary-tint flex items-center justify-center"><Globe className="w-3.5 h-3.5 text-primary" /></div>
              <ArrowRight className="w-3 h-3 text-fg-3" />
              <div className="w-6 h-6 rounded-md bg-warning-tint flex items-center justify-center"><Activity className="w-3.5 h-3.5 text-warning" /></div>
              <div className="flex-1 min-w-0">
                <span className="text-sm text-fg truncate block">{tunnel.name}</span>
                <span className="text-xs text-fg-3"><Badge variant={statusVariant(tunnel.status)} dot>{tunnel.status}</Badge> · {rules.length} 路由</span>
              </div>
              <ArrowRight className="w-3 h-3 text-fg-3" />
              <div className="w-6 h-6 rounded-md bg-success-tint flex items-center justify-center"><Monitor className="w-3.5 h-3.5 text-success" /></div>
            </button>

            {isExpanded && (
              <div className="border-t border-sep-subtle bg-surface-1 p-3 space-y-1">
                {cfgLoading ? (
                  <div className="flex justify-center py-3"><Loader2 className="w-3.5 h-3.5 animate-spin text-fg-3" /></div>
                ) : rules.length === 0 ? (
                  <p className="text-xs text-fg-3 text-center py-2">无 ingress 路由</p>
                ) : rules.map((rule, idx) => {
                  const { protocol, target } = parseService(rule.service)
                  return (
                    <div key={idx} className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-surface-0 text-xs">
                      <Globe className="w-3 h-3 text-primary flex-shrink-0" />
                      <span className="font-mono text-fg truncate flex-1">{rule.hostname}</span>
                      <ArrowRight className="w-3 h-3 text-fg-3" />
                      {protocol && <Badge variant="primary">{protocol}</Badge>}
                      <ArrowRight className="w-3 h-3 text-fg-3" />
                      <Server className="w-3 h-3 text-success flex-shrink-0" />
                      <span className="font-mono text-success truncate">{target}</span>
                    </div>
                  )
                })}
                {ingress.some((r) => !r.hostname) && (
                  <div className="text-xs text-fg-3 px-3 py-1">* catch-all → {ingress.find((r) => !r.hostname)?.service}</div>
                )}
              </div>
            )}
          </Card>
        )
      })}
    </div>
  )
}
