'use client'

import { Lock, ExternalLink } from 'lucide-react'
import Card from '@/components/ui/Card'

export default function CertificateManagement() {
  return (
    <Card className="p-6 text-center space-y-3">
      <Lock className="w-8 h-8 text-primary mx-auto" />
      <h3 className="text-sm font-medium text-fg">证书管理</h3>
      <p className="text-xs text-fg-2 max-w-md mx-auto leading-relaxed">
        Cloudflare Tunnel 自动管理 TLS 证书。边缘证书和源站证书可通过 Dashboard 配置。
      </p>
      <a href="https://dash.cloudflare.com" target="_blank" rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
        打开 Cloudflare Dashboard <ExternalLink className="w-3 h-3" />
      </a>
    </Card>
  )
}
