'use client'

import { useState, useEffect, useCallback } from 'react'
import { BarChart3, ArrowUpDown, Shield, Users, Eye, Loader2 } from 'lucide-react'
import Card from '@/components/ui/Card'
import Select from '@/components/ui/Select'
import { getZoneAnalytics, type ZoneAnalytics as ZA } from '@/lib/api'
import { toast } from '@/lib/toast'

interface Props { zoneId: string; zoneName: string }

const TIME_RANGES = [
  { value: '60', label: '最近 1 小时' },
  { value: '360', label: '最近 6 小时' },
  { value: '1440', label: '最近 24 小时' },
  { value: '10080', label: '最近 7 天' },
  { value: '43200', label: '最近 30 天' },
]

function fmtNum(n: number): string {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + 'B'
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K'
  return n.toString()
}

function fmtBytes(bytes: number): string {
  if (bytes >= 1_073_741_824) return (bytes / 1_073_741_824).toFixed(2) + ' GB'
  if (bytes >= 1_048_576) return (bytes / 1_048_576).toFixed(2) + ' MB'
  if (bytes >= 1_024) return (bytes / 1_024).toFixed(1) + ' KB'
  return bytes + ' B'
}

export default function ZoneAnalytics({ zoneId, zoneName }: Props) {
  const [data, setData] = useState<ZA | null>(null)
  const [loading, setLoading] = useState(false)
  const [range, setRange] = useState('1440')

  const fetch = useCallback(async () => {
    setLoading(true)
    const resp = await getZoneAnalytics(zoneId, parseInt(range, 10))
    if (resp.success && resp.data) setData(resp.data)
    else if (resp.error) toast.error(resp.error.message)
    setLoading(false)
  }, [zoneId, range])

  useEffect(() => { fetch() }, [fetch])

  const cacheRate = data && data.requests.all > 0
    ? ((data.requests.cached / data.requests.all) * 100).toFixed(1)
    : '0'

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-fg-2">
          <span className="font-mono text-primary">{zoneName}</span> 的流量统计
        </p>
        <div className="w-40">
          <Select value={range} onChange={(e) => setRange(e.target.value)} options={TIME_RANGES} />
        </div>
      </div>

      {loading && !data ? (
        <div className="flex justify-center py-16"><Loader2 className="w-5 h-5 animate-spin text-fg-3" /></div>
      ) : data ? (
        <>
          {/* 主指标卡片 */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
            <StatCard icon={BarChart3} iconColor="text-primary" label="总请求" value={fmtNum(data.requests.all)}
              sub={`缓存 ${fmtNum(data.requests.cached)} / 未缓存 ${fmtNum(data.requests.uncached)}`} />
            <StatCard icon={ArrowUpDown} iconColor="text-success" label="总带宽" value={fmtBytes(data.bandwidth.all)}
              sub={`缓存 ${fmtBytes(data.bandwidth.cached)} / 未缓存 ${fmtBytes(data.bandwidth.uncached)}`} />
            <StatCard icon={Shield} iconColor="text-danger" label="威胁拦截" value={fmtNum(data.threats.all)}
              sub="恶意请求" />
            <StatCard icon={Users} iconColor="text-warning" label="独立访客" value={fmtNum(data.uniques.all)}
              sub={`${fmtNum(data.pageviews.all)} 页面浏览`} />
          </div>

          {/* 缓存命中率 + 详情 */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
            <Card className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-fg">缓存命中率</span>
              </div>
              <div className="flex items-end gap-3">
                <span className="text-3xl font-bold text-fg">{cacheRate}%</span>
                <span className="text-xs text-fg-3 mb-1">of total requests served from cache</span>
              </div>
              <div className="w-full h-2 rounded-full bg-surface-1 overflow-hidden">
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${cacheRate}%` }} />
              </div>
              <div className="flex justify-between text-xs text-fg-3">
                <span>缓存: {fmtNum(data.requests.cached)}</span>
                <span>回源: {fmtNum(data.requests.uncached)}</span>
              </div>
            </Card>

            <Card className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <ArrowUpDown className="w-4 h-4 text-success" />
                <span className="text-sm font-medium text-fg">带宽分布</span>
              </div>
              <div className="space-y-2">
                <BandwidthRow label="缓存命中" bytes={data.bandwidth.cached} total={data.bandwidth.all} color="bg-success" />
                <BandwidthRow label="回源请求" bytes={data.bandwidth.uncached} total={data.bandwidth.all} color="bg-warning" />
              </div>
              <div className="pt-2 border-t border-sep-subtle flex justify-between text-xs">
                <span className="text-fg-3">总计</span>
                <span className="font-mono text-fg">{fmtBytes(data.bandwidth.all)}</span>
              </div>
            </Card>
          </div>
        </>
      ) : (
        <Card className="p-12 text-center">
          <p className="text-sm text-fg-3">暂无数据</p>
        </Card>
      )}
    </div>
  )
}

function StatCard({ icon: Icon, iconColor, label, value, sub }: {
  icon: React.ElementType; iconColor: string; label: string; value: string; sub: string
}) {
  return (
    <Card className="p-4 space-y-2">
      <div className="flex items-center gap-2">
        <Icon className={`w-4 h-4 ${iconColor}`} />
        <span className="text-xs text-fg-2">{label}</span>
      </div>
      <p className="text-2xl font-bold text-fg">{value}</p>
      <p className="text-xs text-fg-3">{sub}</p>
    </Card>
  )
}

function BandwidthRow({ label, bytes, total, color }: { label: string; bytes: number; total: number; color: string }) {
  const pct = total > 0 ? (bytes / total) * 100 : 0
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-fg-2">{label}</span>
        <span className="font-mono text-fg">{fmtBytes(bytes)} ({pct.toFixed(1)}%)</span>
      </div>
      <div className="w-full h-1.5 rounded-full bg-surface-1 overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
