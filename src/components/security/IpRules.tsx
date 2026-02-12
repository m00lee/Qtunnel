'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, RefreshCw, Shield, ShieldAlert } from 'lucide-react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import { listZones, listAccessRules, createAccessRule, deleteAccessRule, type Zone, type CfAccessRule } from '@/lib/api'

const MODES = [
  { value: 'block', label: '封禁' },
  { value: 'whitelist', label: '白名单' },
  { value: 'challenge', label: '质询' },
  { value: 'js_challenge', label: 'JS 质询' },
]

export default function IpRules() {
  const [zones, setZones] = useState<Zone[]>([])
  const [zoneId, setZoneId] = useState('')
  const [rules, setRules] = useState<CfAccessRule[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [permError, setPermError] = useState(false)
  const [zoneError, setZoneError] = useState<string | null>(null)
  const [ip, setIp] = useState('')
  const [mode, setMode] = useState('block')
  const [notes, setNotes] = useState('')

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

  const fetchRules = useCallback(async () => {
    if (!zoneId) return
    setLoading(true); setError(null); setPermError(false)
    const resp = await listAccessRules(zoneId)
    if (resp.success && resp.data) setRules(resp.data)
    else if (resp.error) {
      if (resp.error.message.includes('403') || resp.error.message.includes('Forbidden')) {
        setPermError(true)
      } else {
        setError(resp.error.message)
      }
    }
    setLoading(false)
  }, [zoneId])

  useEffect(() => { fetchRules() }, [fetchRules])

  const handleAdd = async () => {
    if (!zoneId || !ip) return
    setError(null)
    const resp = await createAccessRule(zoneId, mode, ip, notes)
    if (resp.success && resp.data) {
      setRules(prev => [resp.data!, ...prev])
      setIp(''); setNotes('')
    } else if (resp.error) setError(resp.error.message)
  }

  const handleDelete = async (ruleId: string) => {
    if (!zoneId) return
    const resp = await deleteAccessRule(zoneId, ruleId)
    if (resp.success) setRules(prev => prev.filter(r => r.id !== ruleId))
    else if (resp.error) setError(resp.error?.message || 'Delete failed')
  }

  const modeLabel = (m: string) => MODES.find(x => x.value === m)?.label || m
  const modeColor = (m: string) => {
    if (m === 'block') return 'text-danger bg-danger-glow'
    if (m === 'whitelist') return 'text-success bg-success-glow'
    return 'text-warning bg-warning-glow'
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
          <p className="text-xs text-muted-foreground">API Token 缺少防火墙访问规则权限</p>
          <p className="text-[10px] text-muted-foreground">请在 Cloudflare Dashboard 编辑 Token，添加 <span className="font-mono text-primary">Zone &gt; Firewall Access Rules &gt; Read</span> 权限</p>
        </Card>
      )}

      {!zoneError && !permError && (
        <>
          {/* Zone 选择 */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <Select value={zoneId} onChange={(e) => setZoneId(e.target.value)}
                options={zones.map(z => ({ value: z.id, label: z.name }))} />
            </div>
            <Button variant="ghost" size="sm" onClick={fetchRules} disabled={loading}
              icon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />} />
          </div>

          {/* 添加规则表单 */}
          <Card className="p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <Input type="text" placeholder="IP 地址" value={ip} onChange={(e) => setIp(e.target.value)} className="flex-1" />
              <Select value={mode} onChange={(e) => setMode(e.target.value)} options={MODES} />
              <Input type="text" placeholder="备注" value={notes} onChange={(e) => setNotes(e.target.value)} className="flex-1" />
              <Button variant="primary" size="sm" onClick={handleAdd} disabled={!ip || !zoneId}
                icon={<Plus className="w-3.5 h-3.5" />}>添加</Button>
            </div>
          </Card>

          {error && (
            <div className="px-4 py-3 bg-danger-glow border border-border-subtle rounded-xl">
              <p className="text-danger text-xs">{error}</p>
            </div>
          )}

          {/* 规则列表 */}
          {rules.length > 0 ? (
            <div className="space-y-2">
              {rules.map(rule => (
                <Card key={rule.id} hover className="p-3">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Shield className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <span className="text-sm font-mono text-foreground">{rule.configuration.value}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-lg font-medium ${modeColor(rule.mode)}`}>
                        {modeLabel(rule.mode)}
                      </span>
                      {rule.notes && <span className="text-xs text-muted-foreground truncate">{rule.notes}</span>}
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(rule.id)}
                      icon={<Trash2 className="w-3.5 h-3.5 text-danger" />} />
                  </div>
                </Card>
              ))}
            </div>
          ) : !loading ? (
            <Card className="py-10 text-center">
              <p className="text-xs text-muted-foreground">暂无 IP 访问规则</p>
            </Card>
          ) : null}
        </>
      )}
    </div>
  )
}
