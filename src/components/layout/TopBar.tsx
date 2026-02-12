'use client'

import { Moon, Sun } from 'lucide-react'
import { useAppStore } from '@/lib/store'

const pageTitles: Record<string, { title: string; subtitle: string }> = {
  tunnels: { title: '隧道管理', subtitle: '管理和监控 Cloudflare 隧道' },
  services: { title: '本地服务', subtitle: '绑定本地服务到隧道' },
  scripts: { title: 'Lua 脚本', subtitle: '自动化脚本管理与执行' },
  security: { title: '安全防护', subtitle: 'WAF、IP 规则和 DDoS 防护' },
  settings: { title: '设置', subtitle: '应用配置与 API 凭证' },
}

export default function TopBar() {
  const { theme, setTheme, activeTab } = useAppStore()
  const page = pageTitles[activeTab] || pageTitles.tunnels

  return (
    <header className="h-14 border-b border-border-subtle bg-sidebar flex items-center justify-between px-6 flex-shrink-0">
      <div className="min-w-0">
        <h1 className="text-[15px] font-semibold text-foreground truncate">{page.title}</h1>
        <p className="text-xs text-muted-foreground truncate">{page.subtitle}</p>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
          className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-card-hover transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {theme === 'light'
            ? <Moon className="w-4 h-4" />
            : <Sun className="w-4 h-4" />}
        </button>
      </div>
    </header>
  )
}
