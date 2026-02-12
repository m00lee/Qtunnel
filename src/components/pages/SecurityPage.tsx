'use client'

import { useState } from 'react'
import { ShieldAlert } from 'lucide-react'
import { useAppStore } from '@/lib/store'
import Tabs from '@/components/ui/Tabs'
import Card from '@/components/ui/Card'
import WafRules from '@/components/security/WafRules'
import IpRules from '@/components/security/IpRules'
import DdosProtection from '@/components/security/DdosProtection'
import CertificateManagement from '@/components/security/CertificateManagement'

const securityTabs = [
  { id: 'waf', label: 'DNS 记录' },
  { id: 'ip-rules', label: 'IP 控制' },
  { id: 'ddos', label: 'DDoS 防护' },
  { id: 'certificates', label: '证书' },
]

export default function SecurityPage() {
  const [activeTab, setActiveTab] = useState('waf')
  const { permissions } = useAppStore()

  // 权限不足提示映射
  const permWarnings: Record<string, { need: string; has: boolean }> = {
    waf: { need: 'Zone > DNS > Read', has: permissions.dns },
    'ip-rules': { need: 'Zone > Firewall Access Rules > Read', has: permissions.firewall },
  }

  const warning = permWarnings[activeTab]
  const showWarning = permissions.checked && warning && !warning.has

  return (
    <div className="space-y-5">
      <Tabs tabs={securityTabs} activeTab={activeTab} onChange={setActiveTab} />

      {showWarning && (
        <Card className="p-4 animate-fade-in">
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-xs font-medium text-foreground">
                检测到 Token 缺少此功能所需权限
              </p>
              <p className="text-[10px] text-muted-foreground">
                请在 Cloudflare Dashboard 编辑 Token，添加{' '}
                <span className="font-mono text-primary">{warning.need}</span> 权限
              </p>
            </div>
          </div>
        </Card>
      )}

      <div className="animate-fade-in">
        {activeTab === 'waf' && <WafRules />}
        {activeTab === 'ip-rules' && <IpRules />}
        {activeTab === 'ddos' && <DdosProtection />}
        {activeTab === 'certificates' && <CertificateManagement />}
      </div>
    </div>
  )
}
