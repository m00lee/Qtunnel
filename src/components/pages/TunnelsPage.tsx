'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Search, RefreshCw, LayoutList, Network, Loader2, WifiOff } from 'lucide-react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import TunnelCard from '@/components/cards/TunnelCard'
import CreateTunnelModal from '@/components/modals/CreateTunnelModal'
import TunnelDetailModal from '@/components/modals/TunnelDetailModal'
import TunnelConfigModal from '@/components/modals/TunnelConfigModal'
import TunnelTopology from '@/components/visualization/TunnelTopology'
import { listTunnels, createTunnel, deleteTunnel, runTunnel, stopTunnel, getRunningTunnels, checkCloudflared, type Tunnel } from '@/lib/api'
import { useAppStore } from '@/lib/store'

type TunnelStatus = 'healthy' | 'degraded' | 'down' | 'inactive'

interface TunnelData {
  id: string
  name: string
  status: TunnelStatus
  connectionsCount: number
  createdAt: string
}

const statusMap: Record<string, TunnelStatus> = {
  healthy: 'healthy',
  active: 'healthy',
  degraded: 'degraded',
  down: 'down',
  inactive: 'inactive',
}

function mapTunnel(t: Tunnel): TunnelData {
  return {
    id: t.id,
    name: t.name,
    status: statusMap[t.status] || 'down',
    connectionsCount: t.connections?.length ?? 0,
    createdAt: t.created_at || '',
  }
}

export default function TunnelsPage() {
  const setConnectionStatus = useAppStore((s) => s.setConnectionStatus)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [detailTunnelId, setDetailTunnelId] = useState<string | null>(null)
  const [configTunnel, setConfigTunnel] = useState<{ id: string; name: string } | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'list' | 'topology'>('list')
  const [tunnels, setTunnels] = useState<TunnelData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [offlineHint, setOfflineHint] = useState<string | null>(null)
  const [runningIds, setRunningIds] = useState<Set<string>>(new Set())
  const [cloudflaredOk, setCloudflaredOk] = useState(true)

  const fetchTunnels = useCallback(async () => {
    setLoading(true)
    setError(null)
    setOfflineHint(null)
    const resp = await listTunnels()
    if (resp.success && resp.data) {
      const mapped = resp.data.map(mapTunnel)
      setTunnels(mapped)
      // 检查是否为离线缓存数据（code 2000）
      if (resp.error && resp.error.code === 2000) {
        setOfflineHint('当前为离线模式，显示缓存数据')
        setConnectionStatus('disconnected')
      } else {
        const hasHealthy = mapped.some((t) => t.status === 'healthy')
        setConnectionStatus(hasHealthy ? 'connected' : 'disconnected')
      }
    } else if (resp.error) {
      const msg = resp.error.code === 1009
        ? '凭据无效或未配置，请在设置页检查 API Token 和 Account ID'
        : resp.error.code === 1008
        ? `网络错误: ${resp.error.message}`
        : resp.error.message
      setError(msg)
      setConnectionStatus('disconnected')
    }
    setLoading(false)
  }, [setConnectionStatus])

  useEffect(() => { fetchTunnels() }, [fetchTunnels])

  // 检测 cloudflared 并获取运行中的隧道
  useEffect(() => {
    checkCloudflared().then(r => setCloudflaredOk(r.success))
    getRunningTunnels().then(r => {
      if (r.success && r.data) setRunningIds(new Set(r.data))
    })
    // 定期刷新运行状态（自动清理已退出的进程）
    const timer = setInterval(async () => {
      const r = await getRunningTunnels()
      if (r.success && r.data) setRunningIds(new Set(r.data))
    }, 10000)
    return () => clearInterval(timer)
  }, [])

  const refreshRunning = async () => {
    const r = await getRunningTunnels()
    if (r.success && r.data) setRunningIds(new Set(r.data))
  }

  const handleRun = async (tunnelId: string) => {
    if (!cloudflaredOk) {
      setError('cloudflared 未安装，请先安装后再启动隧道')
      return
    }
    setError(null)
    const resp = await runTunnel(tunnelId)
    if (resp.success) {
      await refreshRunning()
      // 延迟刷新列表，等待 Cloudflare 更新隧道状态
      setTimeout(async () => {
        await fetchTunnels()
        await refreshRunning()
      }, 5000)
    } else if (resp.error) {
      setError(resp.error.message)
      await refreshRunning() // 同步清理前端状态
    }
  }

  const handleStop = async (tunnelId: string) => {
    setError(null)
    const resp = await stopTunnel(tunnelId)
    if (resp.success) {
      await refreshRunning()
      setTimeout(() => fetchTunnels(), 2000)
    } else if (resp.error) {
      setError(resp.error.message)
    }
  }

  const handleCreate = async (data: { name: string; protocol: string; hostname: string }) => {
    setError(null)
    const resp = await createTunnel(data.name)
    if (resp.success && resp.data) {
      setTunnels((prev) => [...prev, mapTunnel(resp.data!)])
    } else if (resp.error) {
      setError(resp.error.message)
    }
    setShowCreateModal(false)
  }

  const handleDelete = async (tunnelId: string) => {
    setError(null)
    const resp = await deleteTunnel(tunnelId)
    if (resp.success) {
      setTunnels((prev) => prev.filter((t) => t.id !== tunnelId))
    } else if (resp.error) {
      setError(resp.error.message)
    }
  }

  const filteredTunnels = tunnels.filter((t) =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // 统计
  const healthyCount = tunnels.filter((t) => t.status === 'healthy').length
  const totalConns = tunnels.reduce((sum, t) => sum + t.connectionsCount, 0)

  return (
    <div className="space-y-5">
      {/* 统计概览 */}
      {tunnels.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <Card className="p-3 text-center">
            <p className="text-lg font-bold text-foreground">{tunnels.length}</p>
            <p className="text-[10px] text-muted-foreground">总隧道</p>
          </Card>
          <Card className="p-3 text-center">
            <p className="text-lg font-bold text-success">{healthyCount}</p>
            <p className="text-[10px] text-muted-foreground">运行中</p>
          </Card>
          <Card className="p-3 text-center">
            <p className="text-lg font-bold text-primary">{totalConns}</p>
            <p className="text-[10px] text-muted-foreground">活跃连接</p>
          </Card>
        </div>
      )}

      {/* 操作栏 */}
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <Input
            type="text"
            placeholder="搜索隧道..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="w-3.5 h-3.5" />}
          />
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={fetchTunnels}
          disabled={loading}
          icon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}
        />
        {/* View toggle */}
        <div className="flex items-center bg-surface rounded-xl p-0.5">
          <button
            onClick={() => setViewMode('list')}
            className={`p-1.5 rounded-lg transition-colors ${
              viewMode === 'list' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <LayoutList className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setViewMode('topology')}
            className={`p-1.5 rounded-lg transition-colors ${
              viewMode === 'topology' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Network className="w-3.5 h-3.5" />
          </button>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={() => setShowCreateModal(true)}
          icon={<Plus className="w-3.5 h-3.5" />}
        >
          新建
        </Button>
      </div>

      {/* 离线提示 */}
      {offlineHint && (
        <div className="px-4 py-3 bg-warning/10 border border-warning/20 rounded-xl animate-slide-down flex items-center gap-2">
          <WifiOff className="w-3.5 h-3.5 text-warning flex-shrink-0" />
          <p className="text-warning text-xs">{offlineHint}</p>
        </div>
      )}

      {/* 错误 */}
      {error && (
        <div className="px-4 py-3 bg-danger-glow border border-border-subtle rounded-xl animate-slide-down">
          <p className="text-danger text-xs">{error}</p>
        </div>
      )}

      {/* 隧道列表 / 拓扑视图 */}
      {loading && tunnels.length === 0 ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> 加载中...
        </div>
      ) : viewMode === 'topology' ? (
        <TunnelTopology />
      ) : filteredTunnels.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredTunnels.map((tunnel) => (
            <TunnelCard
              key={tunnel.id}
              tunnel={tunnel}
              isRunning={runningIds.has(tunnel.id)}
              onDelete={() => handleDelete(tunnel.id)}
              onDetail={() => setDetailTunnelId(tunnel.id)}
              onConfig={() => setConfigTunnel({ id: tunnel.id, name: tunnel.name })}
              onRun={() => handleRun(tunnel.id)}
              onStop={() => handleStop(tunnel.id)}
            />
          ))}
        </div>
      ) : !loading ? (
        <Card className="py-16 text-center">
          <div className="space-y-3">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-surface flex items-center justify-center">
              <svg className="w-6 h-6 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">暂无隧道</p>
              <p className="text-xs text-muted-foreground mt-1">点击「新建」创建您的第一个隧道</p>
            </div>
          </div>
        </Card>
      ) : null}

      <CreateTunnelModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onConfirm={handleCreate}
      />

      <TunnelDetailModal
        isOpen={!!detailTunnelId}
        tunnelId={detailTunnelId || ''}
        onClose={() => setDetailTunnelId(null)}
      />

      <TunnelConfigModal
        isOpen={!!configTunnel}
        tunnelId={configTunnel?.id || ''}
        tunnelName={configTunnel?.name || ''}
        onClose={() => setConfigTunnel(null)}
      />
    </div>
  )
}
