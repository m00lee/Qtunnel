'use client'

import { useState } from 'react'
import { MoreHorizontal, Trash2, ExternalLink, Settings2, Play, Square, Loader2 } from 'lucide-react'
import Badge from '@/components/ui/Badge'
import clsx from 'clsx'

interface TunnelCardProps {
  tunnel: { id: string; name: string; status: 'healthy' | 'degraded' | 'down' | 'inactive'; connectionsCount: number; createdAt: string }
  isRunning?: boolean
  onDelete?: () => void
  onDetail?: () => void
  onConfig?: () => void
  onRun?: () => Promise<void>
  onStop?: () => Promise<void>
}

const statusMap = {
  healthy: { label: '运行中', variant: 'success' as const },
  degraded: { label: '降级', variant: 'warning' as const },
  down: { label: '已停止', variant: 'danger' as const },
  inactive: { label: '未激活', variant: 'default' as const },
}

export default function TunnelCard({ tunnel, isRunning, onDelete, onDetail, onConfig, onRun, onStop }: TunnelCardProps) {
  const [showMenu, setShowMenu] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const status = statusMap[tunnel.status]

  const handleRunStop = async () => {
    setActionLoading(true)
    try { isRunning ? await onStop?.() : await onRun?.() }
    finally { setActionLoading(false) }
  }

  const formatDate = (d: string) => {
    if (!d) return '-'
    try { return new Date(d).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }) } catch { return '-' }
  }

  return (
    <div className="flex items-center h-row px-3 rounded-md hover:bg-surface-1 transition-colors group">
      {/* Status dot */}
      <div className="w-6 flex-shrink-0">
        <span className={clsx(
          'w-2 h-2 rounded-full inline-block',
          tunnel.status === 'healthy' && 'bg-success',
          tunnel.status === 'degraded' && 'bg-warning',
          tunnel.status === 'down' && 'bg-danger',
          tunnel.status === 'inactive' && 'bg-fg-3',
        )} />
      </div>

      {/* Name + ID */}
      <div className="flex-1 min-w-0 flex items-center gap-2">
        <span className="text-sm text-fg truncate">{tunnel.name}</span>
        <span className="text-xs text-fg-3 font-mono">{tunnel.id.slice(0, 8)}</span>
        {isRunning && <Badge variant="success" dot>本地运行中</Badge>}
      </div>

      {/* Status badge */}
      <div className="w-24 text-center">
        <Badge variant={status.variant} dot>{status.label}</Badge>
      </div>

      {/* Connections */}
      <div className="w-20 text-center text-xs text-fg-2">{tunnel.connectionsCount}</div>

      {/* Date */}
      <div className="w-28 text-right text-xs text-fg-3">{formatDate(tunnel.createdAt)}</div>

      {/* Actions */}
      <div className="w-24 flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={handleRunStop}
          disabled={actionLoading}
          className={clsx(
            'p-1.5 rounded-md transition-colors',
            isRunning ? 'text-danger hover:bg-danger-tint' : 'text-success hover:bg-success-tint',
            'disabled:opacity-50',
          )}
        >
          {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
            : isRunning ? <Square className="w-3.5 h-3.5 fill-current" />
            : <Play className="w-3.5 h-3.5 fill-current" />}
        </button>

        <div className="relative">
          <button onClick={() => setShowMenu(!showMenu)} className="p-1.5 rounded-md text-fg-3 hover:text-fg hover:bg-surface-1 transition-colors">
            <MoreHorizontal className="w-3.5 h-3.5" />
          </button>
          {showMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 top-full mt-1 w-32 bg-surface-0 border border-sep rounded-md shadow-md z-20 py-0.5 animate-scale-in">
                <button onClick={() => { setShowMenu(false); onDetail?.() }}
                  className="w-full text-left px-3 py-1.5 text-xs text-fg hover:bg-surface-1 flex items-center gap-2">
                  <ExternalLink className="w-3 h-3" />详情
                </button>
                <button onClick={() => { setShowMenu(false); onConfig?.() }}
                  className="w-full text-left px-3 py-1.5 text-xs text-fg hover:bg-surface-1 flex items-center gap-2">
                  <Settings2 className="w-3 h-3" />配置
                </button>
                <div className="h-px bg-sep-subtle mx-2 my-0.5" />
                <button onClick={() => { setShowMenu(false); onDelete?.() }}
                  className="w-full text-left px-3 py-1.5 text-xs text-danger hover:bg-danger-tint flex items-center gap-2">
                  <Trash2 className="w-3 h-3" />删除
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
