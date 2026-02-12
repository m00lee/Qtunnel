'use client'

import { useState, useEffect } from 'react'
import {
  Globe, Server, ArrowRight, Activity, Monitor, Loader2, ChevronDown, ChevronRight,
} from 'lucide-react'
import Card from '@/components/ui/Card'
import {
  listTunnels, getTunnelConfig,
  type Tunnel, type IngressRule,
} from '@/lib/api'

interface TunnelTopologyData {
  tunnel: Tunnel
  ingress: IngressRule[]
  loading: boolean
}

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
      const initial: TunnelTopologyData[] = tunnelList.map((t) => ({
        tunnel: t,
        ingress: [],
        loading: true,
      }))
      setData(initial)
      setLoading(false)

      // Expand all by default
      setExpanded(new Set(tunnelList.map((t) => t.id)))

      // Fetch configs in parallel
      const updated = await Promise.all(
        tunnelList.map(async (t) => {
          const cfgResp = await getTunnelConfig(t.id)
          const ingress = cfgResp.success && cfgResp.data ? (cfgResp.data as IngressRule[]) : []
          return { tunnel: t, ingress, loading: false }
        })
      )
      setData(updated)
    })()
  }, [])

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const statusDot = (status: string) => {
    if (status === 'healthy') return 'bg-success shadow-[0_0_6px_var(--color-success)]'
    if (status === 'inactive') return 'bg-muted-foreground'
    return 'bg-warning shadow-[0_0_6px_var(--color-warning)]'
  }

  const parseService = (svc: string) => {
    const match = svc.match(/^(https?|tcp|ssh|rdp|unix):\/\/(.+)/)
    if (match) return { protocol: match[1].toUpperCase(), target: match[2] }
    return { protocol: '', target: svc }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <Card className="py-12 text-center">
        <Activity className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
        <p className="text-xs text-muted-foreground">暂无隧道数据</p>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-[10px] text-muted-foreground px-1">
        <span className="flex items-center gap-1.5">
          <Globe className="w-3 h-3 text-primary" /> Cloudflare Edge
        </span>
        <span className="flex items-center gap-1.5">
          <Activity className="w-3 h-3 text-warning" /> 隧道
        </span>
        <span className="flex items-center gap-1.5">
          <Monitor className="w-3 h-3 text-success" /> 本地服务
        </span>
      </div>

      {data.map(({ tunnel, ingress, loading: cfgLoading }) => {
        const isExpanded = expanded.has(tunnel.id)
        const rules = ingress.filter((r) => !!r.hostname)
        const catchAll = ingress.find((r) => !r.hostname)

        return (
          <Card key={tunnel.id} className="overflow-hidden">
            {/* Tunnel Header Row */}
            <button
              className="w-full flex items-center gap-3 p-4 hover:bg-surface/50 transition-colors text-left"
              onClick={() => toggle(tunnel.id)}
            >
              {isExpanded
                ? <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                : <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              }

              {/* CF Edge Node */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="w-8 h-8 rounded-lg bg-primary-glow flex items-center justify-center">
                  <Globe className="w-4 h-4 text-primary" />
                </div>
              </div>

              {/* Arrow */}
              <ArrowRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />

              {/* Tunnel Node */}
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-warning-glow flex items-center justify-center">
                  <Activity className="w-4 h-4 text-warning" />
                </div>
                <div className="min-w-0">
                  <span className="text-sm font-medium text-foreground truncate block">{tunnel.name}</span>
                  <div className="flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${statusDot(tunnel.status)}`} />
                    <span className="text-[10px] text-muted-foreground">{tunnel.status}</span>
                    <span className="text-[10px] text-muted-foreground">· {rules.length} 路由</span>
                  </div>
                </div>
              </div>

              {/* Arrow */}
              <ArrowRight className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />

              {/* Local Services summary */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="w-8 h-8 rounded-lg bg-success-glow flex items-center justify-center">
                  <Monitor className="w-4 h-4 text-success" />
                </div>
                <span className="text-xs text-muted-foreground hidden sm:inline">本地服务</span>
              </div>
            </button>

            {/* Expanded: Ingress Rules as Flow */}
            {isExpanded && (
              <div className="border-t border-border-subtle bg-surface/30 p-4 space-y-2">
                {cfgLoading ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  </div>
                ) : rules.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-3">无 ingress 路由规则</p>
                ) : (
                  rules.map((rule, idx) => {
                    const { protocol, target } = parseService(rule.service)
                    return (
                      <div key={idx}
                        className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 px-3 py-2.5 rounded-xl bg-card border border-border-subtle">
                        {/* Hostname */}
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <Globe className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                          <span className="text-xs font-mono text-foreground truncate">{rule.hostname}</span>
                        </div>

                        {/* Arrow */}
                        <ArrowRight className="w-3 h-3 text-muted-foreground hidden sm:block flex-shrink-0" />

                        {/* Protocol badge */}
                        {protocol && (
                          <span className="text-[10px] px-2 py-0.5 rounded-lg bg-primary-glow text-primary font-medium flex-shrink-0">
                            {protocol}
                          </span>
                        )}

                        {/* Arrow */}
                        <ArrowRight className="w-3 h-3 text-muted-foreground hidden sm:block flex-shrink-0" />

                        {/* Target */}
                        <div className="flex items-center gap-2 min-w-0">
                          <Server className="w-3.5 h-3.5 text-success flex-shrink-0" />
                          <span className="text-xs font-mono text-success truncate">{target}</span>
                        </div>
                      </div>
                    )
                  })
                )}

                {/* Catch-all */}
                {catchAll && (
                  <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-surface/50 border border-border-subtle opacity-50">
                    <Globe className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">* (catch-all)</span>
                    <ArrowRight className="w-3 h-3 text-muted-foreground" />
                    <span className="text-xs font-mono text-muted-foreground">{catchAll.service}</span>
                  </div>
                )}
              </div>
            )}
          </Card>
        )
      })}
    </div>
  )
}
