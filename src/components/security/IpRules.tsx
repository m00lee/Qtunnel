'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, RefreshCw, Shield, ShieldAlert } from 'lucide-react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Badge from '@/components/ui/Badge'
import { listZones, listAccessRules, createAccessRule, deleteAccessRule, type Zone, type CfAccessRule } from '@/lib/api'
import { toast } from '@/lib/toast'

const MODES = [
  { value: 'block', label: '封禁' }, { value: 'whitelist', label: '白名单' },
  { value: 'challenge', label: '质询' }, { value: 'js_challenge', label: 'JS 质询' },
]

export default function IpRules() {
  const [zones, setZones] = useState<Zone[]>([])
  const [zoneId, setZoneId] = useState('')
  const [rules, setRules] = useState<CfAccessRule[]>([])
  const [loading, setLoading] = useState(false)
  const [permError, setPermError] = useState(false)
  const [zoneError, setZoneError] = useState<string | null>(null)
  const [ip, setIp] = useState('')
  const [mode, setMode] = useState('block')
  const [notes, setNotes] = useState('')

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

  const fetchRules = useCallback(async () => {
    if (!zoneId) return
    setLoading(true); setPermError(false)
    const resp = await listAccessRules(zoneId)
    if (resp.success && resp.data) setRules(resp.data)
    else if (resp.error) {
      if (resp.error.message.includes('403') || resp.error.message.includes('Forbidden')) setPermError(true)
      else toast.error(resp.error.message)
    }
    setLoading(false)
  }, [zoneId])

  useEffect(() => { fetchRules() }, [fetchRules])

  const handleAdd = async () => {
    if (!zoneId || !ip) return
    const resp = await createAccessRule(zoneId, mode, ip, notes)
    if (resp.success && resp.data) { setRules((prev) => [resp.data!, ...prev]); setIp(''); setNotes(''); toast.success(`IP 规则已添加: ${ip}`) }
    else if (resp.error) toast.error(resp.error.message)
  }

  const handleDelete = async (ruleId: string) => {
    if (!zoneId) return
    const resp = await deleteAccessRule(zoneId, ruleId)
    if (resp.success) { setRules((prev) => prev.filter((r) => r.id !== ruleId)); toast.success('IP 规则已删除') }
    else if (resp.error) toast.error(resp.error.message)
  }

  const modeLabel = (m: string) => MODES.find((x) => x.value === m)?.label || m
  const modeVariant = (m: string): 'danger' | 'success' | 'warning' | 'default' => {
    if (m === 'block') return 'danger'
    if (m === 'whitelist') return 'success'
    return 'warning'
  }

  if (zoneError || permError) {
    return (
      <Card className="p-6 text-center space-y-2">
        <ShieldAlert className="w-6 h-6 text-warning mx-auto" />
        <p className="text-sm font-medium text-fg">权限不足</p>
        <p className="text-xs text-fg-2">{zoneError || 'API Token 缺少防火墙访问规则权限'}</p>
        <p className="text-xs text-fg-3">请添加 <span className="font-mono text-primary">Zone &gt; Firewall Access Rules &gt; Read</span> 权限</p>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="flex-1 max-w-xs">
          <Select value={zoneId} onChange={(e) => setZoneId(e.target.value)} options={zones.map((z) => ({ value: z.id, label: z.name }))} />
        </div>
        <Button variant="ghost" size="sm" onClick={fetchRules} disabled={loading}
          icon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />} />
      </div>

      {/* Add form */}
      <Card className="p-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Input type="text" placeholder="IP 地址" value={ip} onChange={(e) => setIp(e.target.value)} className="flex-1 min-w-[120px]" />
          <Select value={mode} onChange={(e) => setMode(e.target.value)} options={MODES} className="w-28" />
          <Input type="text" placeholder="备注" value={notes} onChange={(e) => setNotes(e.target.value)} className="flex-1 min-w-[120px]" />
          <Button variant="primary" size="sm" onClick={handleAdd} disabled={!ip || !zoneId} icon={<Plus className="w-3 h-3" />}>添加</Button>
        </div>
      </Card>

      {rules.length > 0 ? (
        <div className="space-y-0.5">
          {rules.map((rule) => (
            <div key={rule.id} className="flex items-center h-row px-3 rounded-md hover:bg-surface-1 transition-colors group">
              <Shield className="w-3.5 h-3.5 text-fg-3 flex-shrink-0 mr-2" />
              <span className="text-sm font-mono text-fg">{rule.configuration.value}</span>
              <Badge variant={modeVariant(rule.mode)} className="ml-2">{modeLabel(rule.mode)}</Badge>
              {rule.notes && <span className="text-xs text-fg-3 truncate ml-2">{rule.notes}</span>}
              <div className="flex-1" />
              <button onClick={() => handleDelete(rule.id)}
                className="p-1 rounded-md text-fg-3 hover:text-danger hover:bg-danger-tint opacity-0 group-hover:opacity-100 transition-all">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      ) : !loading ? (
        <Card className="py-8 text-center text-xs text-fg-3">暂无 IP 访问规则</Card>
      ) : null}
    </div>
  )
}
