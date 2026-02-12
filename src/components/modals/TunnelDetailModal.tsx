'use client'

import { useEffect, useState } from 'react'
import { Wifi, WifiOff, Clock, Copy, Check, Terminal } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import { getTunnel, getTunnelToken, type Tunnel, type TunnelConnection } from '@/lib/api'
import { toast } from '@/lib/toast'

interface TunnelDetailModalProps { isOpen: boolean; tunnelId: string; onClose: () => void }

const statusMap: Record<string, { label: string; variant: 'success' | 'warning' | 'danger' | 'default' }> = {
  healthy: { label: '运行中', variant: 'success' },
  degraded: { label: '降级', variant: 'warning' },
  down: { label: '已停止', variant: 'danger' },
  inactive: { label: '未激活', variant: 'default' },
}

function fmtDate(d: string | null) {
  if (!d) return '-'
  try { return new Date(d).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) } catch { return d }
}

export default function TunnelDetailModal({ isOpen, tunnelId, onClose }: TunnelDetailModalProps) {
  const [tunnel, setTunnel] = useState<Tunnel | null>(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [tunnelToken, setTunnelToken] = useState<string | null>(null)
  const [tokenLoading, setTokenLoading] = useState(false)
  const [copiedToken, setCopiedToken] = useState(false)

  useEffect(() => {
    if (!isOpen || !tunnelId) return
    setLoading(true)
    getTunnel(tunnelId).then((resp) => {
      if (resp.success && resp.data) setTunnel(resp.data)
      else if (resp.error) toast.error(resp.error.message)
      setLoading(false)
    })
  }, [isOpen, tunnelId])

  const status = statusMap[tunnel?.status || ''] || statusMap.inactive

  const handleCopyId = async () => {
    try { await navigator.clipboard.writeText(tunnelId); setCopied(true); setTimeout(() => setCopied(false), 1500) } catch {}
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="隧道详情" width="lg" footer={<Button variant="ghost" size="sm" onClick={onClose}>关闭</Button>}>
      <div className="space-y-4">
        {loading && <div className="py-8 text-center text-fg-3 text-xs">加载中...</div>}
        {tunnel && !loading && (
          <>
            {/* Basic */}
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-fg">{tunnel.name}</h3>
              <Badge variant={status.variant} dot>{status.label}</Badge>
            </div>

            <Card className="p-3 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-fg-2">Tunnel ID</span>
                <div className="flex items-center gap-1">
                  <span className="font-mono text-fg">{tunnel.id}</span>
                  <button onClick={handleCopyId} className="p-0.5 rounded text-fg-3 hover:text-fg transition-colors">
                    {copied ? <Check className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              </div>
              {tunnel.tun_type && <div className="flex justify-between"><span className="text-fg-2">类型</span><span className="font-mono text-fg">{tunnel.tun_type}</span></div>}
              <div className="flex justify-between"><span className="text-fg-2">远程配置</span><span className="text-fg">{tunnel.remote_config ? '是' : '否'}</span></div>
              <div className="flex justify-between"><span className="text-fg-2">Account Tag</span><span className="font-mono text-fg truncate ml-4 max-w-[200px]">{tunnel.account_tag || '-'}</span></div>
            </Card>

            {/* Timestamps */}
            <Card className="p-3 space-y-2 text-xs">
              <div className="flex items-center gap-1.5 mb-1"><Clock className="w-3 h-3 text-fg-3" /><span className="font-medium text-fg">时间信息</span></div>
              <div className="flex justify-between"><span className="text-fg-2">创建时间</span><span className="text-fg">{fmtDate(tunnel.created_at)}</span></div>
              <div className="flex justify-between"><span className="text-fg-2">最后活跃</span><span className="text-fg">{fmtDate(tunnel.conns_active_at)}</span></div>
              <div className="flex justify-between"><span className="text-fg-2">最后离线</span><span className="text-fg">{fmtDate(tunnel.conns_inactive_at)}</span></div>
            </Card>

            {/* Connections */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs">
                {tunnel.connections.length > 0 ? <Wifi className="w-3.5 h-3.5 text-primary" /> : <WifiOff className="w-3.5 h-3.5 text-fg-3" />}
                <span className="font-medium text-fg">活跃连接 ({tunnel.connections.length})</span>
              </div>
              {tunnel.connections.length > 0 ? (
                <div className="space-y-1">
                  {tunnel.connections.map((conn: TunnelConnection) => (
                    <Card key={conn.id} className="p-3">
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                        <div><span className="text-fg-3">数据中心</span><p className="font-mono text-fg">{conn.colo_name || '-'}</p></div>
                        <div><span className="text-fg-3">来源 IP</span><p className="font-mono text-fg">{conn.origin_ip || '-'}</p></div>
                        <div><span className="text-fg-3">客户端版本</span><p className="font-mono text-fg">{conn.client_version || '-'}</p></div>
                        <div><span className="text-fg-3">连接时间</span><p className="text-fg">{fmtDate(conn.opened_at)}</p></div>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : <Card className="p-3 text-center text-xs text-fg-3">暂无活跃连接</Card>}
            </div>

            {/* Run token */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs">
                <Terminal className="w-3.5 h-3.5 text-fg-3" />
                <span className="font-medium text-fg">手动运行</span>
              </div>
              {!tunnelToken ? (
                <Button variant="ghost" size="sm" onClick={async () => {
                  setTokenLoading(true)
                  const r = await getTunnelToken(tunnelId)
                  if (r.success && r.data) setTunnelToken(r.data)
                  else toast.error(r.error?.message || '获取令牌失败')
                  setTokenLoading(false)
                }} disabled={tokenLoading}>
                  {tokenLoading ? '获取中...' : '显示运行令牌'}
                </Button>
              ) : (
                <Card className="p-3 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-fg-3">运行命令</span>
                    <button onClick={async () => {
                      try { await navigator.clipboard.writeText(`cloudflared tunnel run --token ${tunnelToken}`); setCopiedToken(true); setTimeout(() => setCopiedToken(false), 1500) } catch {}
                    }} className="p-0.5 rounded text-fg-3 hover:text-fg transition-colors">
                      {copiedToken ? <Check className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                  <code className="block font-mono text-fg bg-surface-1 rounded-md p-2 break-all select-all">
                    cloudflared tunnel run --token {tunnelToken.substring(0, 20)}...
                  </code>
                  <p className="text-fg-3">在终端运行此命令手动启动隧道，或在列表中点击 ▶ 按钮</p>
                </Card>
              )}
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}
