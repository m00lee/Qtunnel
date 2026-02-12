'use client'

import { useState } from 'react'
import { MoreHorizontal, Trash2, ExternalLink, Settings2, Wifi, Play, Square, Loader2 } from 'lucide-react'
import Card from '@/components/ui/Card'

interface TunnelCardProps {
  tunnel: {
    id: string
    name: string
    status: 'healthy' | 'degraded' | 'down' | 'inactive'
    connectionsCount: number
    createdAt: string
  }
  isRunning?: boolean
  onDelete?: () => void
  onDetail?: () => void
  onConfig?: () => void
  onRun?: () => Promise<void>
  onStop?: () => Promise<void>
}

const statusConfig = {
  healthy: { label: '运行中', dot: 'bg-success', bg: 'bg-success-glow', text: 'text-success' },
  degraded: { label: '降级', dot: 'bg-warning', bg: 'bg-warning-glow', text: 'text-warning' },
  down: { label: '已停止', dot: 'bg-danger', bg: 'bg-danger-glow', text: 'text-danger' },
  inactive: { label: '未激活', dot: 'bg-muted-foreground', bg: 'bg-surface', text: 'text-muted-foreground' },
}

export default function TunnelCard({ tunnel, isRunning, onDelete, onDetail, onConfig, onRun, onStop }: TunnelCardProps) {
  const [showMenu, setShowMenu] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const status = statusConfig[tunnel.status]

  const handleRunStop = async () => {
    setActionLoading(true)
    try {
      if (isRunning) {
        await onStop?.()
      } else {
        await onRun?.()
      }
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <Card hover className="p-4 group relative">
      <div className="flex items-start justify-between mb-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
            {tunnel.name}
          </h3>
          <p className="text-[11px] text-muted-foreground mt-0.5 font-mono truncate">
            {tunnel.id.substring(0, 8)}...{tunnel.id.substring(tunnel.id.length - 4)}
          </p>
        </div>
        <div className="relative ml-2">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface transition-all"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
          {showMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 top-full mt-1 w-36 bg-card border border-border rounded-xl shadow-elevated z-20 py-1 animate-scale-in">
                <button
                  onClick={() => { setShowMenu(false); onDetail?.() }}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-card-hover flex items-center gap-2 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />详情
                </button>
                <button
                  onClick={() => { setShowMenu(false); onConfig?.() }}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-card-hover flex items-center gap-2 transition-colors"
                >
                  <Settings2 className="w-3.5 h-3.5" />配置
                </button>
                <div className="h-px bg-border-subtle mx-2 my-1" />
                <button
                  onClick={() => { setShowMenu(false); onDelete?.() }}
                  className="w-full text-left px-3 py-2 text-xs text-danger hover:bg-danger-glow flex items-center gap-2 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />删除
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium ${status.bg} ${status.text}`}>
            <div className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
            {status.label}
          </div>
          {tunnel.connectionsCount > 0 && (
            <div className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium bg-primary-glow text-primary">
              <Wifi className="w-3 h-3" />
              {tunnel.connectionsCount}
            </div>
          )}
          {isRunning && (
            <div className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium bg-success-glow text-success">
              <Play className="w-2.5 h-2.5 fill-current" /> 本地运行中
            </div>
          )}
        </div>
        <button
          onClick={handleRunStop}
          disabled={actionLoading}
          title={isRunning ? '停止隧道' : '启动隧道'}
          className={`p-1.5 rounded-lg transition-all ${
            isRunning
              ? 'text-danger hover:bg-danger-glow'
              : 'text-success hover:bg-success-glow'
          } disabled:opacity-50`}
        >
          {actionLoading
            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
            : isRunning
              ? <Square className="w-3.5 h-3.5 fill-current" />
              : <Play className="w-3.5 h-3.5 fill-current" />}
        </button>
      </div>

      {tunnel.createdAt ? (
        <div className="text-[11px] text-muted-foreground">
          {new Date(tunnel.createdAt).toLocaleDateString('zh-CN', {
            year: 'numeric', month: 'short', day: 'numeric',
          })}
        </div>
      ) : (
        <div className="text-[11px] text-muted-foreground">-</div>
      )}
    </Card>
  )
}
