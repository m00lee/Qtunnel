'use client'

import { useState, useEffect } from 'react'
import { Zap, Globe, Server } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import { listZones, listTunnels, quickBind, type Zone, type Tunnel } from '@/lib/api'
import { toast } from '@/lib/toast'

interface QuickBindModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  preselectedTunnelId?: string
}

const PROTOCOLS = [
  { value: 'http', label: 'HTTP' }, { value: 'https', label: 'HTTPS' },
  { value: 'tcp', label: 'TCP' }, { value: 'ssh', label: 'SSH' }, { value: 'rdp', label: 'RDP' },
]

export default function QuickBindModal({ isOpen, onClose, onSuccess, preselectedTunnelId }: QuickBindModalProps) {
  const [tunnels, setTunnels] = useState<Tunnel[]>([])
  const [zones, setZones] = useState<Zone[]>([])
  const [tunnelId, setTunnelId] = useState(preselectedTunnelId || '')
  const [zoneId, setZoneId] = useState('')
  const [subdomain, setSubdomain] = useState('')
  const [protocol, setProtocol] = useState('http')
  const [localPort, setLocalPort] = useState('8080')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    if (preselectedTunnelId) setTunnelId(preselectedTunnelId)
    ;(async () => {
      const [tResp, zResp] = await Promise.all([listTunnels(), listZones()])
      if (tResp.success && tResp.data) setTunnels(tResp.data)
      if (zResp.success && zResp.data) setZones(zResp.data)
      else if (zResp.error) toast.error('无法加载域名: ' + zResp.error.message)
    })()
  }, [isOpen, preselectedTunnelId])

  const selectedZone = zones.find((z) => z.id === zoneId)
  const fullHostname = subdomain ? `${subdomain}.${selectedZone?.name || '???'}` : selectedZone?.name || ''

  const handleSubmit = async () => {
    if (!tunnelId || !zoneId || !localPort) return
    setLoading(true)
    const port = parseInt(localPort, 10)
    if (isNaN(port) || port < 1 || port > 65535) { toast.warning('端口范围 1-65535'); setLoading(false); return }
    const resp = await quickBind(tunnelId, zoneId, selectedZone?.name || '', subdomain, protocol, port)
    if (resp.success && resp.data) {
      toast.success(`已绑定 ${resp.data.hostname} → ${resp.data.service}`)
      setTimeout(() => { onSuccess(); onClose() }, 800)
    } else if (resp.error) toast.error(resp.error.message)
    setLoading(false)
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="一键绑定服务" width="lg"
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose}>取消</Button>
          <Button variant="primary" size="sm" onClick={handleSubmit} disabled={loading || !tunnelId || !zoneId || !localPort}
            icon={<Zap className="w-3.5 h-3.5" />}>
            {loading ? '绑定中...' : '一键绑定'}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div>
          <label className="text-xs font-medium text-fg-2 flex items-center gap-1 mb-1"><Server className="w-3 h-3" />隧道</label>
          <Select value={tunnelId} onChange={(e) => setTunnelId(e.target.value)}
            options={[{ value: '', label: '请选择隧道...' }, ...tunnels.map((t) => ({ value: t.id, label: `${t.name} (${t.status})` }))]} />
        </div>
        <div>
          <label className="text-xs font-medium text-fg-2 flex items-center gap-1 mb-1"><Globe className="w-3 h-3" />域名</label>
          <Select value={zoneId} onChange={(e) => setZoneId(e.target.value)}
            options={[{ value: '', label: zones.length > 0 ? '请选择域名...' : '加载中...' }, ...zones.map((z) => ({ value: z.id, label: z.name }))]} />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div><label className="text-xs font-medium text-fg-2 mb-1 block">子域名</label><Input type="text" placeholder="api" value={subdomain} onChange={(e) => setSubdomain(e.target.value)} /></div>
          <div><label className="text-xs font-medium text-fg-2 mb-1 block">协议</label><Select value={protocol} onChange={(e) => setProtocol(e.target.value)} options={PROTOCOLS} /></div>
          <div><label className="text-xs font-medium text-fg-2 mb-1 block">端口</label><Input type="number" placeholder="8080" value={localPort} onChange={(e) => setLocalPort(e.target.value)} /></div>
        </div>
        {zoneId && (
          <div className="p-3 rounded-md bg-surface-1 text-xs space-y-1">
            <p className="text-fg-2">绑定预览:</p>
            <p className="font-mono"><span className="text-primary">{fullHostname}</span> → <span className="text-success">{protocol}://localhost:{localPort || '?'}</span></p>
          </div>
        )}
      </div>
    </Modal>
  )
}
