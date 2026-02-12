'use client'

import { Shield, ExternalLink } from 'lucide-react'
import Card from '@/components/ui/Card'

export default function DdosProtection() {
  return (
    <Card className="p-6 text-center space-y-3">
      <Shield className="w-8 h-8 text-primary mx-auto" />
      <h3 className="text-sm font-medium text-fg">DDoS 防护</h3>
      <p className="text-xs text-fg-2 max-w-md mx-auto leading-relaxed">
        Cloudflare 自动为所有通过隧道的流量提供 DDoS 防护。高级规则可通过 Dashboard 管理。
      </p>
      <a href="https://dash.cloudflare.com" target="_blank" rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
        打开 Cloudflare Dashboard <ExternalLink className="w-3 h-3" />
      </a>
    </Card>
  )
}
