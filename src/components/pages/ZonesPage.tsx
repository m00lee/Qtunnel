'use client'

import { useState, useEffect } from 'react'
import { Globe, ShieldAlert } from 'lucide-react'
import { useAppStore } from '@/lib/store'
import { listZones, type Zone } from '@/lib/api'
import Tabs from '@/components/ui/Tabs'
import Select from '@/components/ui/Select'
import Card from '@/components/ui/Card'
import { toast } from '@/lib/toast'
import ZoneAnalytics from '@/components/zones/ZoneAnalytics'
import ZoneSettings from '@/components/zones/ZoneSettings'
import ZoneCache from '@/components/zones/ZoneCache'
import ZoneRules from '@/components/zones/ZoneRules'

const zoneTabs = [
  { id: 'analytics', label: '流量分析' },
  { id: 'settings', label: '域名设置' },
  { id: 'cache', label: '缓存管理' },
  { id: 'rules', label: '规则' },
]

export default function ZonesPage() {
  const [activeTab, setActiveTab] = useState('analytics')
  const [zones, setZones] = useState<Zone[]>([])
  const [zoneId, setZoneId] = useState('')
  const [loading, setLoading] = useState(true)
  const { permissions } = useAppStore()

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      const resp = await listZones()
      if (resp.success && resp.data) {
        setZones(resp.data)
        if (resp.data.length > 0 && !zoneId) setZoneId(resp.data[0].id)
      } else if (resp.error) toast.error(resp.error.message)
      setLoading(false)
    })()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const selectedZone = zones.find((z) => z.id === zoneId)

  const showPermWarning = permissions.checked && !permissions.zones

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-fg">域名管理</h1>
          <p className="text-xs text-fg-2 mt-0.5">流量分析、SSL/TLS、缓存清除、页面规则</p>
        </div>
        <div className="w-56">
          <Select
            value={zoneId}
            onChange={(e) => setZoneId(e.target.value)}
            options={[
              { value: '', label: loading ? '加载中...' : zones.length > 0 ? '选择域名...' : '无可用域名' },
              ...zones.map((z) => ({ value: z.id, label: z.name })),
            ]}
          />
        </div>
      </div>

      {showPermWarning && (
        <Card className="p-4 animate-fade-in">
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-medium text-fg">Token 可能缺少 Zone 相关权限</p>
              <p className="text-xs text-fg-2 mt-0.5">
                部分功能需要 <span className="font-mono text-primary">Zone Settings Read/Edit</span> 权限
              </p>
            </div>
          </div>
        </Card>
      )}

      <Tabs tabs={zoneTabs} activeTab={activeTab} onChange={setActiveTab} />

      {!zoneId ? (
        <Card className="p-12 text-center animate-fade-in">
          <Globe className="w-8 h-8 text-fg-3 mx-auto mb-3" />
          <p className="text-sm text-fg-2">请先在右上角选择一个域名</p>
        </Card>
      ) : (
        <div className="animate-fade-in">
          {activeTab === 'analytics' && <ZoneAnalytics zoneId={zoneId} zoneName={selectedZone?.name || ''} />}
          {activeTab === 'settings' && <ZoneSettings zoneId={zoneId} />}
          {activeTab === 'cache' && <ZoneCache zoneId={zoneId} zoneName={selectedZone?.name || ''} />}
          {activeTab === 'rules' && <ZoneRules zoneId={zoneId} />}
        </div>
      )}
    </div>
  )
}
