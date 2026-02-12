'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Label from '@/components/ui/Label'
import Select from '@/components/ui/Select'

interface CreateTunnelModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (data: { name: string; protocol: string; hostname: string }) => void
}

export default function CreateTunnelModal({ isOpen, onClose, onConfirm }: CreateTunnelModalProps) {
  const [name, setName] = useState('')
  const [protocol, setProtocol] = useState('http')
  const [hostname, setHostname] = useState('')

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    onConfirm({ name: name.trim(), protocol, hostname: hostname.trim() })
    setName('')
    setProtocol('http')
    setHostname('')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-overlay" onClick={onClose} />
      <div className="relative w-full max-w-md mx-4 bg-card border border-border-subtle rounded-2xl shadow-modal animate-scale-in">
        <div className="flex items-center justify-between p-5 border-b border-border-subtle">
          <h2 className="text-sm font-semibold text-foreground">新建隧道</h2>
          <button onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <Label>隧道名称</Label>
            <Input type="text" placeholder="输入隧道名称" value={name}
              onChange={(e) => setName(e.target.value)} autoFocus />
          </div>
          <div>
            <Label>协议类型</Label>
            <Select value={protocol} onChange={(e) => setProtocol(e.target.value)}
              options={[
                { value: 'http', label: 'HTTP' },
                { value: 'https', label: 'HTTPS' },
                { value: 'tcp', label: 'TCP' },
                { value: 'ssh', label: 'SSH' },
                { value: 'rdp', label: 'RDP' },
              ]} />
          </div>
          <div>
            <Label>主机名</Label>
            <Input type="text" placeholder="tunnel.example.com" value={hostname}
              onChange={(e) => setHostname(e.target.value)} />
          </div>
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button variant="ghost" size="sm" type="button" onClick={onClose}>取消</Button>
            <Button variant="primary" size="sm" type="submit">创建</Button>
          </div>
        </form>
      </div>
    </div>
  )
}
