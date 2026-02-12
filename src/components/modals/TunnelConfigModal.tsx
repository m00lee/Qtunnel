'use client'

import { useState, useEffect } from 'react'
import { X, Plus, Trash2, Loader2 } from 'lucide-react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Label from '@/components/ui/Label'
import { getTunnelConfig, updateTunnelConfig, type IngressRule } from '@/lib/api'

interface TunnelConfigModalProps {
  isOpen: boolean
  tunnelId: string
  tunnelName: string
  onClose: () => void
}

export default function TunnelConfigModal({ isOpen, tunnelId, tunnelName, onClose }: TunnelConfigModalProps) {
  const [ingress, setIngress] = useState<IngressRule[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen || !tunnelId) return
    ;(async () => {
      setLoading(true); setError(null)
      const resp = await getTunnelConfig(tunnelId)
      if (resp.success && resp.data) {
        // Filter out catch-all for editing
        const rules = (resp.data as IngressRule[]).filter((r) => !!r.hostname)
        setIngress(rules.length > 0 ? rules : [{ hostname: '', service: 'http://localhost:8080' }])
      } else if (resp.error) {
        setError(resp.error.message)
        setIngress([{ hostname: '', service: 'http://localhost:8080' }])
      }
      setLoading(false)
    })()
  }, [isOpen, tunnelId])

  if (!isOpen) return null

  const addEntry = () => {
    setIngress([...ingress, { hostname: '', service: 'http://localhost:' }])
  }

  const removeEntry = (idx: number) => {
    if (ingress.length <= 1) return
    setIngress(ingress.filter((_, i) => i !== idx))
  }

  const updateEntry = (idx: number, field: keyof IngressRule, value: string) => {
    setIngress(ingress.map((entry, i) => i === idx ? { ...entry, [field]: value } : entry))
  }

  const handleSave = async () => {
    setSaving(true); setError(null)
    // Build full config with catch-all appended
    const rules: IngressRule[] = [
      ...ingress.filter((r) => r.hostname && r.service),
      { hostname: null, service: 'http_status:404' },
    ]
    const resp = await updateTunnelConfig(tunnelId, rules)
    if (resp.success) {
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } else if (resp.error) {
      setError(resp.error.message)
    }
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-overlay" onClick={onClose} />
      <div className="relative w-full max-w-lg mx-4 bg-card border border-border-subtle rounded-2xl shadow-modal animate-scale-in max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border-subtle flex-shrink-0">
          <div>
            <h2 className="text-sm font-semibold text-foreground">隧道配置</h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">{tunnelName}</p>
          </div>
          <button onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="px-4 py-3 bg-danger-glow border border-border-subtle rounded-xl">
              <p className="text-danger text-xs">{error}</p>
            </div>
          )}

          {/* Tunnel ID */}
          <Card className="p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Tunnel ID</span>
              <span className="text-xs font-mono text-foreground">{tunnelId}</span>
            </div>
          </Card>

          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* Ingress Rules */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Ingress 规则</Label>
                  <Button variant="ghost" size="sm" onClick={addEntry}
                    icon={<Plus className="w-3.5 h-3.5" />}>
                    添加
                  </Button>
                </div>

                {ingress.map((entry, idx) => (
                  <Card key={idx} className="p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-muted-foreground font-medium">规则 {idx + 1}</span>
                      {ingress.length > 1 && (
                        <button onClick={() => removeEntry(idx)}
                          className="p-1 rounded text-muted-foreground hover:text-danger transition-colors">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <span className="text-[10px] text-muted-foreground">主机名</span>
                        <Input type="text" placeholder="tunnel.example.com"
                          value={entry.hostname || ''}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateEntry(idx, 'hostname', e.target.value)} />
                      </div>
                      <div>
                        <span className="text-[10px] text-muted-foreground">后端服务</span>
                        <Input type="text" placeholder="http://localhost:8080"
                          value={entry.service}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateEntry(idx, 'service', e.target.value)} />
                      </div>
                    </div>
                  </Card>
                ))}

                <p className="text-[10px] text-muted-foreground">
                  * 系统会自动追加 catch-all 规则 (http_status:404) 作为最后一条
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-5 border-t border-border-subtle flex-shrink-0">
          <Button variant="ghost" size="sm" onClick={onClose}>取消</Button>
          <Button variant="primary" size="sm" onClick={handleSave} disabled={saving || loading}>
            {saved ? '已保存 ✓' : saving ? '保存中...' : '保存配置'}
          </Button>
        </div>
      </div>
    </div>
  )
}
