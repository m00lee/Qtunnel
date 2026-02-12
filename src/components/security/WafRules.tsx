'use client'

import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, Trash2, Globe, ShieldAlert } from 'lucide-react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Select from '@/components/ui/Select'
import Badge from '@/components/ui/Badge'
import { listZones, listDnsRecords, deleteDnsRecord, type Zone, type DnsRecord } from '@/lib/api'
import { toast } from '@/lib/toast'

export default function WafRules() {
  const [zones, setZones] = useState<Zone[]>([])
  const [zoneId, setZoneId] = useState('')
  const [records, setRecords] = useState<DnsRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [permError, setPermError] = useState(false)
  const [zoneError, setZoneError] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      const resp = await listZones()
      if (resp.success && resp.data) { setZones(resp.data); if (resp.data.length > 0) setZoneId(resp.data[0].id) }
      else if (resp.error) {
        if (resp.error.message.includes('403') || resp.error.message.includes('Forbidden'))
          setZoneError('API Token 缺少 Zone:Read 权限')
        else setZoneError(resp.error.message)
      }
    })()
  }, [])

  const fetchRecords = useCallback(async () => {
    if (!zoneId) return
    setLoading(true); setPermError(false)
    const resp = await listDnsRecords(zoneId)
    if (resp.success && resp.data) setRecords(resp.data)
    else if (resp.error) {
      if (resp.error.message.includes('403') || resp.error.message.includes('Forbidden')) setPermError(true)
      else toast.error(resp.error.message)
    }
    setLoading(false)
  }, [zoneId])

  useEffect(() => { fetchRecords() }, [fetchRecords])

  const handleDelete = async (recordId: string) => {
    if (!zoneId) return
    const resp = await deleteDnsRecord(zoneId, recordId)
    if (resp.success) { setRecords((prev) => prev.filter((r) => r.id !== recordId)); toast.success('DNS 记录已删除') }
    else if (resp.error) toast.error(resp.error.message)
  }

  const typeVariant = (t: string): 'primary' | 'success' | 'warning' | 'default' => {
    if (t === 'CNAME') return 'primary'
    if (t === 'A') return 'success'
    if (t === 'AAAA') return 'warning'
    return 'default'
  }

  if (zoneError || permError) {
    return (
      <Card className="p-6 text-center space-y-2">
        <ShieldAlert className="w-6 h-6 text-warning mx-auto" />
        <p className="text-sm font-medium text-fg">权限不足</p>
        <p className="text-xs text-fg-2">{zoneError || 'API Token 缺少 DNS 读取权限'}</p>
        <p className="text-xs text-fg-3">请添加 <span className="font-mono text-primary">Zone &gt; DNS &gt; Read</span> 权限</p>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="flex-1 max-w-xs">
          <Select value={zoneId} onChange={(e) => setZoneId(e.target.value)} options={zones.map((z) => ({ value: z.id, label: z.name }))} />
        </div>
        <Button variant="ghost" size="sm" onClick={fetchRecords} disabled={loading}
          icon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />} />
      </div>

      {records.length > 0 ? (
        <div className="space-y-0.5">
          {records.map((rec) => (
            <div key={rec.id} className="flex items-center h-row px-3 rounded-md hover:bg-surface-1 transition-colors group">
              <Globe className="w-3.5 h-3.5 text-fg-3 flex-shrink-0 mr-2" />
              <span className="text-sm font-mono text-fg truncate flex-1">{rec.name}</span>
              <Badge variant={typeVariant(rec.record_type)}>{rec.record_type}</Badge>
              <span className="text-xs text-fg-2 truncate ml-2 flex-1">→ {rec.content}</span>
              {rec.proxied && <Badge variant="warning" className="ml-2">代理</Badge>}
              <button onClick={() => handleDelete(rec.id)}
                className="p-1 rounded-md text-fg-3 hover:text-danger hover:bg-danger-tint ml-2 opacity-0 group-hover:opacity-100 transition-all">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      ) : !loading ? (
        <Card className="py-8 text-center text-xs text-fg-3">暂无 DNS 记录</Card>
      ) : null}
    </div>
  )
}
