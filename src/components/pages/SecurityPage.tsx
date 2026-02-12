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

  const permWarnings: Record<string, { need: string; has: boolean }> = {
    waf: { need: 'Zone > DNS > Read', has: permissions.dns },
    'ip-rules': { need: 'Zone > Firewall Access Rules > Read', has: permissions.firewall },
  }

  const warning = permWarnings[activeTab]
  const showWarning = permissions.checked && warning && !warning.has

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-fg">安全防护</h1>
        <p className="text-xs text-fg-2 mt-0.5">DNS 记录、IP 规则和证书管理</p>
      </div>

      <Tabs tabs={securityTabs} activeTab={activeTab} onChange={setActiveTab} />

      {showWarning && (
        <Card className="p-4 animate-fade-in">
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-medium text-fg">检测到 Token 缺少此功能所需权限</p>
              <p className="text-xs text-fg-2 mt-0.5">
                请在 Cloudflare Dashboard 添加 <span className="font-mono text-primary">{warning.need}</span> 权限
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
