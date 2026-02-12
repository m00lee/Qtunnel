'use client'

import { Lock, ExternalLink } from 'lucide-react'
import Card from '@/components/ui/Card'

export default function CertificateManagement() {
  return (
    <Card className="p-6 text-center space-y-4">
      <Lock className="w-10 h-10 text-primary mx-auto" />
      <h3 className="text-sm font-medium text-foreground">证书管理</h3>
      <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
        Cloudflare Tunnel 自动管理 TLS 证书。边缘证书和源站证书
        可通过 Cloudflare Dashboard 进行高级配置。
      </p>
      <a href="https://dash.cloudflare.com" target="_blank" rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline">
        打开 Cloudflare Dashboard
        <ExternalLink className="w-3 h-3" />
      </a>
    </Card>
  )
}
