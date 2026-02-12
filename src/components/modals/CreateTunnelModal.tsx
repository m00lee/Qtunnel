'use client'

import { useState } from 'react'
import Modal from '@/components/ui/Modal'
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    onConfirm({ name: name.trim(), protocol, hostname: hostname.trim() })
    setName(''); setProtocol('http'); setHostname('')
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="新建隧道"
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose}>取消</Button>
          <Button variant="primary" size="sm" onClick={() => {
            if (name.trim()) {
              onConfirm({ name: name.trim(), protocol, hostname: hostname.trim() })
              setName(''); setProtocol('http'); setHostname('')
            }
          }}>创建</Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        <div><Label>隧道名称</Label><Input type="text" placeholder="输入隧道名称" value={name} onChange={(e) => setName(e.target.value)} autoFocus /></div>
        <div><Label>协议类型</Label><Select value={protocol} onChange={(e) => setProtocol(e.target.value)}
          options={[{ value: 'http', label: 'HTTP' }, { value: 'https', label: 'HTTPS' }, { value: 'tcp', label: 'TCP' }, { value: 'ssh', label: 'SSH' }, { value: 'rdp', label: 'RDP' }]} /></div>
        <div><Label>主机名</Label><Input type="text" placeholder="tunnel.example.com" value={hostname} onChange={(e) => setHostname(e.target.value)} /></div>
      </form>
    </Modal>
  )
}
