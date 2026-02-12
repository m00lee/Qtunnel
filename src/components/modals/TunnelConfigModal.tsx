'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash2, Loader2 } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Label from '@/components/ui/Label'
import { getTunnelConfig, updateTunnelConfig, type IngressRule } from '@/lib/api'
import { toast } from '@/lib/toast'

interface TunnelConfigModalProps {
  isOpen: boolean; tunnelId: string; tunnelName: string; onClose: () => void
}

export default function TunnelConfigModal({ isOpen, tunnelId, tunnelName, onClose }: TunnelConfigModalProps) {
  const [ingress, setIngress] = useState<IngressRule[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!isOpen || !tunnelId) return
    ;(async () => {
      setLoading(true)
      const resp = await getTunnelConfig(tunnelId)
      if (resp.success && resp.data) {
        const rules = (resp.data as IngressRule[]).filter((r) => !!r.hostname)
        setIngress(rules.length > 0 ? rules : [{ hostname: '', service: 'http://localhost:8080' }])
      } else if (resp.error) {
        toast.error(resp.error.message)
        setIngress([{ hostname: '', service: 'http://localhost:8080' }])
      }
      setLoading(false)
    })()
  }, [isOpen, tunnelId])

  const addEntry = () => setIngress([...ingress, { hostname: '', service: 'http://localhost:' }])
  const removeEntry = (idx: number) => { if (ingress.length > 1) setIngress(ingress.filter((_, i) => i !== idx)) }
  const updateEntry = (idx: number, field: keyof IngressRule, value: string) =>
    setIngress(ingress.map((e, i) => (i === idx ? { ...e, [field]: value } : e)))

  const handleSave = async () => {
    setSaving(true)
    const rules: IngressRule[] = [...ingress.filter((r) => r.hostname && r.service), { hostname: null, service: 'http_status:404' }]
    const resp = await updateTunnelConfig(tunnelId, rules)
    if (resp.success) toast.success('配置已保存')
    else if (resp.error) toast.error(resp.error.message)
    setSaving(false)
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="隧道配置" subtitle={tunnelName} width="lg"
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose}>取消</Button>
          <Button variant="primary" size="sm" onClick={handleSave} disabled={saving || loading}>
            {saving ? '保存中...' : '保存配置'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between p-2 rounded-md bg-surface-1 text-xs">
          <span className="text-fg-2">Tunnel ID</span>
          <span className="font-mono text-fg">{tunnelId}</span>
        </div>

        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-4 h-4 animate-spin text-fg-3" /></div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="mb-0">Ingress 规则</Label>
              <Button variant="ghost" size="sm" onClick={addEntry} icon={<Plus className="w-3 h-3" />}>添加</Button>
            </div>
            {ingress.map((entry, idx) => (
              <Card key={idx} className="p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-fg-3 font-medium">规则 {idx + 1}</span>
                  {ingress.length > 1 && (
                    <button onClick={() => removeEntry(idx)} className="p-1 rounded text-fg-3 hover:text-danger transition-colors">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-xs text-fg-3">主机名</span>
                    <Input type="text" placeholder="tunnel.example.com" value={entry.hostname || ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateEntry(idx, 'hostname', e.target.value)} />
                  </div>
                  <div>
                    <span className="text-xs text-fg-3">后端服务</span>
                    <Input type="text" placeholder="http://localhost:8080" value={entry.service}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateEntry(idx, 'service', e.target.value)} />
                  </div>
                </div>
              </Card>
            ))}
            <p className="text-xs text-fg-3">系统自动追加 catch-all 规则 (http_status:404)</p>
          </div>
        )}
      </div>
    </Modal>
  )
}
