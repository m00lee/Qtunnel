'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Search, RefreshCw, Loader2, WifiOff } from 'lucide-react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Card from '@/components/ui/Card'
import CreateTunnelModal from '@/components/modals/CreateTunnelModal'
import TunnelDetailModal from '@/components/modals/TunnelDetailModal'
import TunnelConfigModal from '@/components/modals/TunnelConfigModal'
import {
  listTunnels, createTunnel, deleteTunnel,
  runTunnel, stopTunnel, getRunningTunnels, checkCloudflared,
  type Tunnel,
} from '@/lib/api'
import { useAppStore } from '@/lib/store'
import TunnelCard from '@/components/cards/TunnelCard'
import { toast } from '@/lib/toast'

type TunnelStatus = 'healthy' | 'degraded' | 'down' | 'inactive'

interface TunnelData {
  id: string; name: string; status: TunnelStatus
  connectionsCount: number; createdAt: string
}

const statusMap: Record<string, TunnelStatus> = {
  healthy: 'healthy', active: 'healthy', degraded: 'degraded', down: 'down', inactive: 'inactive',
}

function mapTunnel(t: Tunnel): TunnelData {
  return {
    id: t.id, name: t.name,
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
  const [tunnels, setTunnels] = useState<TunnelData[]>([])
  const [loading, setLoading] = useState(true)
  const [offlineHint, setOfflineHint] = useState<string | null>(null)
  const [runningIds, setRunningIds] = useState<Set<string>>(new Set())
  const [cloudflaredOk, setCloudflaredOk] = useState(true)

  const fetchTunnels = useCallback(async () => {
    setLoading(true); setOfflineHint(null)
    const resp = await listTunnels()
    if (resp.success && resp.data) {
      const mapped = resp.data.map(mapTunnel)
      setTunnels(mapped)
      if (resp.error && resp.error.code === 2000) {
        setOfflineHint('离线模式，显示缓存数据')
        toast.warning('网络不可用，显示缓存数据')
        setConnectionStatus('disconnected')
      } else {
        setConnectionStatus(mapped.some((t) => t.status === 'healthy') ? 'connected' : 'disconnected')
      }
    } else if (resp.error) {
      toast.error(
        resp.error.code === 1009 ? '凭据无效，请检查设置'
        : resp.error.code === 1008 ? `网络错误: ${resp.error.message}`
        : resp.error.message,
      )
      setConnectionStatus('disconnected')
    }
    setLoading(false)
  }, [setConnectionStatus])

  useEffect(() => { fetchTunnels() }, [fetchTunnels])

  useEffect(() => {
    checkCloudflared().then((r) => setCloudflaredOk(r.success))
    getRunningTunnels().then((r) => { if (r.success && r.data) setRunningIds(new Set(r.data)) })
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
    if (!cloudflaredOk) { toast.error('cloudflared 未安装'); return }
    const resp = await runTunnel(tunnelId)
    if (resp.success) {
      toast.success('隧道已启动')
      await refreshRunning()
      setTimeout(async () => { await fetchTunnels(); await refreshRunning() }, 5000)
    } else if (resp.error) { toast.error(resp.error.message); await refreshRunning() }
  }

  const handleStop = async (tunnelId: string) => {
    const resp = await stopTunnel(tunnelId)
    if (resp.success) { toast.success('隧道已停止'); await refreshRunning(); setTimeout(() => fetchTunnels(), 2000) }
    else if (resp.error) toast.error(resp.error.message)
  }

  const handleCreate = async (data: { name: string; protocol: string; hostname: string }) => {
    const resp = await createTunnel(data.name)
    if (resp.success && resp.data) { setTunnels((prev) => [...prev, mapTunnel(resp.data!)]); toast.success(`隧道「${data.name}」创建成功`) }
    else if (resp.error) toast.error(resp.error.message)
    setShowCreateModal(false)
  }

  const handleDelete = async (tunnelId: string) => {
    const resp = await deleteTunnel(tunnelId)
    if (resp.success) { setTunnels((prev) => prev.filter((t) => t.id !== tunnelId)); toast.success('隧道已删除') }
    else if (resp.error) toast.error(resp.error.message)
  }

  const filtered = tunnels.filter((t) => t.name.toLowerCase().includes(searchQuery.toLowerCase()))
  const healthyCount = tunnels.filter((t) => t.status === 'healthy').length
  const totalConns = tunnels.reduce((sum, t) => sum + t.connectionsCount, 0)

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-semibold text-fg">隧道管理</h1>
          <p className="text-xs text-fg-2 mt-0.5">
            {tunnels.length} 个隧道 · <span className="text-success">{healthyCount} 运行中</span> · {totalConns} 活跃连接
          </p>
        </div>
        <Input
          leftIcon={<Search className="w-3.5 h-3.5" />}
          placeholder="搜索..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-[180px]"
        />
        <Button variant="ghost" size="sm" onClick={fetchTunnels} disabled={loading}
          icon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />} />
        <Button variant="primary" size="sm" onClick={() => setShowCreateModal(true)} icon={<Plus className="w-3.5 h-3.5" />}>
          新建
        </Button>
      </div>

      {/* Alerts */}
      {offlineHint && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-warning-tint text-warning text-xs">
          <WifiOff className="w-3.5 h-3.5 flex-shrink-0" /> {offlineHint}
        </div>
      )}

      {/* Content */}
      {loading && tunnels.length === 0 ? (
        <div className="flex items-center justify-center py-16 text-fg-2 text-sm">
          <Loader2 className="w-4 h-4 animate-spin mr-2" /> 加载中...
        </div>
      ) : filtered.length > 0 ? (
        <div className="space-y-1">
          {/* List header */}
          <div className="flex items-center px-3 py-1.5 text-xs text-fg-3 font-medium">
            <div className="w-6" />
            <div className="flex-1">名称</div>
            <div className="w-24 text-center">状态</div>
            <div className="w-20 text-center">连接</div>
            <div className="w-28 text-right">创建时间</div>
            <div className="w-24" />
          </div>
          {/* List rows */}
          {filtered.map((tunnel) => (
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
        <Card className="py-12 text-center">
          <p className="text-sm text-fg">暂无隧道</p>
          <p className="text-xs text-fg-2 mt-1">点击「新建」创建第一个隧道</p>
        </Card>
      ) : null}

      <CreateTunnelModal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} onConfirm={handleCreate} />
      <TunnelDetailModal isOpen={!!detailTunnelId} tunnelId={detailTunnelId || ''} onClose={() => setDetailTunnelId(null)} />
      <TunnelConfigModal isOpen={!!configTunnel} tunnelId={configTunnel?.id || ''} tunnelName={configTunnel?.name || ''} onClose={() => setConfigTunnel(null)} />
    </div>
  )
}
