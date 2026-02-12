'use client'

import { useEffect, useState } from 'react'
import { useAppStore, type PermissionState } from '@/lib/store'
import { loadSettings, verifyToken } from '@/lib/api'
import { Settings, AlertTriangle } from 'lucide-react'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import TunnelsPage from '@/components/pages/TunnelsPage'
import ServicesPage from '@/components/pages/ServicesPage'
import SecurityPage from '@/components/pages/SecurityPage'
import SettingsPage from '@/components/pages/SettingsPage'
import ScriptsPage from '@/components/pages/ScriptsPage'

export default function DashboardContent() {
  const { activeTab, setActiveTab, setPermissions } = useAppStore()
  const [hasCredentials, setHasCredentials] = useState<boolean | null>(null)

  useEffect(() => {
    ;(async () => {
      const resp = await loadSettings()
      if (resp.success && resp.data) {
        const hasCreds = !!resp.data.cf_api_token && !!resp.data.cf_account_id
        setHasCredentials(hasCreds)

        // 预防式权限校验
        if (hasCreds) {
          const verifyResp = await verifyToken()
          if (verifyResp.success && verifyResp.data) {
            const perms = verifyResp.data.permissions
            const groups = perms
              .filter(p => p.effect === 'allow')
              .flatMap(p => p.permission_groups)
              .map(g => g.toLowerCase())

            const permState: PermissionState = {
              checked: true,
              tunnels: groups.some(g => g.includes('tunnel')),
              dns: groups.some(g => g.includes('dns')),
              firewall: groups.some(g => g.includes('firewall') || g.includes('access rule')),
              zones: groups.some(g => g.includes('zone')),
            }

            // 如果获取不到权限详情（token 无自读权限），默认全部开启
            if (perms.length === 0) {
              permState.tunnels = true
              permState.dns = true
              permState.firewall = true
              permState.zones = true
            }

            setPermissions(permState)
          }
        }
      } else {
        setHasCredentials(false)
      }
    })()
  }, [activeTab, setPermissions])

  // 需要凭据才能使用的页面
  const needsAuth = ['tunnels', 'services', 'security'].includes(activeTab)

  if (hasCredentials === false && needsAuth) {
    return (
      <div className="p-6 max-w-6xl mx-auto animate-fade-in">
        <Card className="py-16 text-center">
          <div className="space-y-4 flex flex-col items-center">
            <div className="w-14 h-14 rounded-2xl bg-warning/10 flex items-center justify-center">
              <AlertTriangle className="w-7 h-7 text-warning" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">尚未配置 Cloudflare 凭据</p>
              <p className="text-xs text-muted-foreground mt-1">
                请先在设置页面配置 API Token 和 Account ID，然后保存设置
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setActiveTab('settings')}
              icon={<Settings className="w-3.5 h-3.5" />}
            >
              前往设置
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-6xl mx-auto animate-fade-in">
      {activeTab === 'tunnels' && <TunnelsPage />}
      {activeTab === 'services' && <ServicesPage />}
      {activeTab === 'scripts' && <ScriptsPage />}
      {activeTab === 'security' && <SecurityPage />}
      {activeTab === 'settings' && <SettingsPage />}
    </div>
  )
}
