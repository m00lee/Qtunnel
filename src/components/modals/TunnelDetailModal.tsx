'use client'

import { useEffect, useState } from 'react'
import { X, Wifi, WifiOff, Clock, Copy, Check, Terminal } from 'lucide-react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { getTunnel, getTunnelToken, type Tunnel, type TunnelConnection } from '@/lib/api'

interface TunnelDetailModalProps {
  isOpen: boolean
  tunnelId: string
  onClose: () => void
}

const statusConfig: Record<string, { label: string; dot: string; text: string }> = {
  healthy: { label: '运行中', dot: 'bg-success', text: 'text-success' },
  degraded: { label: '降级', dot: 'bg-warning', text: 'text-warning' },
  down: { label: '已停止', dot: 'bg-danger', text: 'text-danger' },
  inactive: { label: '未激活', dot: 'bg-muted-foreground', text: 'text-muted-foreground' },
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-'
  try {
    return new Date(dateStr).toLocaleString('zh-CN', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit',
    })
  } catch {
    return dateStr
  }
}

export default function TunnelDetailModal({ isOpen, tunnelId, onClose }: TunnelDetailModalProps) {
  const [tunnel, setTunnel] = useState<Tunnel | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [tunnelToken, setTunnelToken] = useState<string | null>(null)
  const [tokenLoading, setTokenLoading] = useState(false)
  const [copiedToken, setCopiedToken] = useState(false)

  useEffect(() => {
    if (!isOpen || !tunnelId) return
    setLoading(true)
    setError(null)
    getTunnel(tunnelId).then((resp) => {
      if (resp.success && resp.data) {
        setTunnel(resp.data)
      } else if (resp.error) {
        setError(resp.error.message)
      }
      setLoading(false)
    })
  }, [isOpen, tunnelId])

  if (!isOpen) return null

  const status = statusConfig[tunnel?.status || ''] || statusConfig.inactive

  const handleCopyId = async () => {
    try {
      await navigator.clipboard.writeText(tunnelId)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch { /* noop */ }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-overlay" onClick={onClose} />
      <div className="relative w-full max-w-lg mx-4 bg-card border border-border-subtle rounded-2xl shadow-modal animate-scale-in max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border-subtle flex-shrink-0">
          <h2 className="text-sm font-semibold text-foreground">隧道详情</h2>
          <button onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {loading && (
            <div className="py-8 text-center text-muted-foreground text-xs">加载中...</div>
          )}
          {error && (
            <div className="px-4 py-3 bg-danger-glow border border-border-subtle rounded-xl">
              <p className="text-danger text-xs">{error}</p>
            </div>
          )}
          {tunnel && !loading && (
            <>
              {/* Basic info */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-semibold text-foreground">{tunnel.name}</h3>
                  <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium ${status.text}`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                    {status.label}
                  </div>
                </div>

                <Card className="p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Tunnel ID</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-mono text-foreground">{tunnel.id}</span>
                      <button onClick={handleCopyId}
                        className="p-0.5 rounded text-muted-foreground hover:text-foreground transition-colors">
                        {copied ? <Check className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>
                  {tunnel.tun_type && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">类型</span>
                      <span className="text-xs font-mono text-foreground">{tunnel.tun_type}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">远程配置</span>
                    <span className="text-xs text-foreground">{tunnel.remote_config ? '是' : '否'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Account Tag</span>
                    <span className="text-xs font-mono text-foreground truncate ml-4 max-w-[200px]">{tunnel.account_tag || '-'}</span>
                  </div>
                </Card>
              </div>

              {/* Timestamps */}
              <Card className="p-3 space-y-2">
                <div className="flex items-center gap-1.5 mb-1">
                  <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs font-medium text-foreground">时间信息</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">创建时间</span>
                  <span className="text-xs text-foreground">{formatDate(tunnel.created_at)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">最后活跃</span>
                  <span className="text-xs text-foreground">{formatDate(tunnel.conns_active_at)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">最后离线</span>
                  <span className="text-xs text-foreground">{formatDate(tunnel.conns_inactive_at)}</span>
                </div>
              </Card>

              {/* Connections */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  {tunnel.connections.length > 0
                    ? <Wifi className="w-3.5 h-3.5 text-primary" />
                    : <WifiOff className="w-3.5 h-3.5 text-muted-foreground" />}
                  <span className="text-xs font-medium text-foreground">
                    活跃连接 ({tunnel.connections.length})
                  </span>
                </div>
                {tunnel.connections.length > 0 ? (
                  <div className="space-y-1.5">
                    {tunnel.connections.map((conn: TunnelConnection) => (
                      <Card key={conn.id} className="p-3">
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                          <div>
                            <span className="text-[10px] text-muted-foreground">数据中心</span>
                            <p className="text-xs font-mono text-foreground">{conn.colo_name || '-'}</p>
                          </div>
                          <div>
                            <span className="text-[10px] text-muted-foreground">来源 IP</span>
                            <p className="text-xs font-mono text-foreground">{conn.origin_ip || '-'}</p>
                          </div>
                          <div>
                            <span className="text-[10px] text-muted-foreground">客户端版本</span>
                            <p className="text-xs font-mono text-foreground">{conn.client_version || '-'}</p>
                          </div>
                          <div>
                            <span className="text-[10px] text-muted-foreground">连接时间</span>
                            <p className="text-xs text-foreground">{formatDate(conn.opened_at)}</p>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card className="p-4 text-center">
                    <p className="text-xs text-muted-foreground">暂无活跃连接</p>
                  </Card>
                )}
              </div>

              {/* 运行令牌 */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs font-medium text-foreground">手动运行</span>
                </div>
                {!tunnelToken ? (
                  <Button
                    variant="ghost" size="sm"
                    onClick={async () => {
                      setTokenLoading(true)
                      const r = await getTunnelToken(tunnelId)
                      if (r.success && r.data) setTunnelToken(r.data)
                      else setError(r.error?.message || '获取令牌失败')
                      setTokenLoading(false)
                    }}
                    disabled={tokenLoading}
                  >
                    {tokenLoading ? '获取中...' : '显示运行令牌'}
                  </Button>
                ) : (
                  <Card className="p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground">运行命令</span>
                      <button
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(`cloudflared tunnel run --token ${tunnelToken}`)
                            setCopiedToken(true)
                            setTimeout(() => setCopiedToken(false), 1500)
                          } catch {}
                        }}
                        className="p-0.5 rounded text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {copiedToken ? <Check className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                    <code className="block text-[10px] font-mono text-foreground bg-surface rounded-lg p-2 break-all select-all">
                      cloudflared tunnel run --token {tunnelToken.substring(0, 20)}...
                    </code>
                    <p className="text-[10px] text-muted-foreground">
                      在终端中运行此命令可手动启动隧道连接器，或在隧道卡片上点击 ▶ 按钮自动启动
                    </p>
                  </Card>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-5 border-t border-border-subtle flex-shrink-0">
          <Button variant="ghost" size="sm" onClick={onClose}>关闭</Button>
        </div>
      </div>
    </div>
  )
}
