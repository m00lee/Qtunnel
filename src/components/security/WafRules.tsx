'use client'

import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, Trash2, Globe, ShieldAlert } from 'lucide-react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Select from '@/components/ui/Select'
import { listZones, listDnsRecords, deleteDnsRecord, type Zone, type DnsRecord } from '@/lib/api'

export default function WafRules() {
  const [zones, setZones] = useState<Zone[]>([])
  const [zoneId, setZoneId] = useState('')
  const [records, setRecords] = useState<DnsRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [permError, setPermError] = useState(false)
  const [zoneError, setZoneError] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      const resp = await listZones()
      if (resp.success && resp.data) {
        setZones(resp.data)
        if (resp.data.length > 0) setZoneId(resp.data[0].id)
      } else if (resp.error) {
        if (resp.error.message.includes('403') || resp.error.message.includes('Forbidden')) {
          setZoneError('API Token 缺少 Zone:Read 权限，无法获取域名列表')
        } else {
          setZoneError(resp.error.message)
        }
      }
    })()
  }, [])

  const fetchRecords = useCallback(async () => {
    if (!zoneId) return
    setLoading(true); setError(null); setPermError(false)
    const resp = await listDnsRecords(zoneId)
    if (resp.success && resp.data) setRecords(resp.data)
    else if (resp.error) {
      if (resp.error.message.includes('403') || resp.error.message.includes('Forbidden')) {
        setPermError(true)
      } else {
        setError(resp.error.message)
      }
    }
    setLoading(false)
  }, [zoneId])

  useEffect(() => { fetchRecords() }, [fetchRecords])

  const handleDelete = async (recordId: string) => {
    if (!zoneId) return
    const resp = await deleteDnsRecord(zoneId, recordId)
    if (resp.success) setRecords(prev => prev.filter(r => r.id !== recordId))
    else if (resp.error) setError(resp.error?.message || 'Delete failed')
  }

  const typeColor = (t: string) => {
    if (t === 'CNAME') return 'text-primary bg-primary-glow'
    if (t === 'A') return 'text-success bg-success-glow'
    if (t === 'AAAA') return 'text-warning bg-warning-glow'
    return 'text-muted-foreground bg-surface'
  }

  return (
    <div className="space-y-4">
      {zoneError && (
        <Card className="p-5 text-center space-y-3">
          <ShieldAlert className="w-8 h-8 text-warning mx-auto" />
          <p className="text-sm font-medium text-foreground">权限不足</p>
          <p className="text-xs text-muted-foreground">{zoneError}</p>
          <p className="text-[10px] text-muted-foreground">请在 Cloudflare Dashboard 编辑 Token，添加 <span className="font-mono text-primary">Zone &gt; Zone &gt; Read</span> 权限</p>
        </Card>
      )}

      {permError && (
        <Card className="p-5 text-center space-y-3">
          <ShieldAlert className="w-8 h-8 text-warning mx-auto" />
          <p className="text-sm font-medium text-foreground">权限不足</p>
          <p className="text-xs text-muted-foreground">API Token 缺少 DNS 读取权限</p>
          <p className="text-[10px] text-muted-foreground">请在 Cloudflare Dashboard 编辑 Token，添加 <span className="font-mono text-primary">Zone &gt; DNS &gt; Read</span> 权限</p>
        </Card>
      )}

      {!zoneError && !permError && (
        <>
          <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <Select value={zoneId} onChange={(e) => setZoneId(e.target.value)}
            options={zones.map(z => ({ value: z.id, label: z.name }))} />
        </div>
        <Button variant="ghost" size="sm" onClick={fetchRecords} disabled={loading}
          icon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />} />
      </div>

      {error && (
        <div className="px-4 py-3 bg-danger-glow border border-border-subtle rounded-xl">
          <p className="text-danger text-xs">{error}</p>
        </div>
      )}

      {records.length > 0 ? (
        <div className="space-y-2">
          {records.map(rec => (
            <Card key={rec.id} hover className="p-3">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <Globe className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-sm font-mono text-foreground truncate">{rec.name}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-lg font-medium flex-shrink-0 ${typeColor(rec.record_type)}`}>
                    {rec.record_type}
                  </span>
                  <span className="text-xs text-muted-foreground truncate hidden sm:inline">→ {rec.content}</span>
                </div>
                <div className="flex items-center gap-2">
                  {rec.proxied && (
                    <span className="text-[10px] px-2 py-0.5 rounded-lg bg-warning-glow text-warning">代理</span>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(rec.id)}
                    icon={<Trash2 className="w-3.5 h-3.5 text-danger" />} />
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : !loading ? (
        <Card className="py-10 text-center">
          <p className="text-xs text-muted-foreground">暂无 DNS 记录</p>
        </Card>
      ) : null}
        </>
      )}
    </div>
  )
}
