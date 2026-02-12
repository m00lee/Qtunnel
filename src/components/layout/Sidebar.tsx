'use client'

import { useAppStore } from '@/lib/store'
import { Globe, Zap, Shield, Settings, Code, Layers, ChevronLeft, ChevronRight } from 'lucide-react'
import clsx from 'clsx'

const navItems = [
  { id: 'tunnels', icon: Globe, label: '隧道' },
  { id: 'services', icon: Zap, label: '服务' },
  { id: 'zones', icon: Layers, label: '域名' },
  { id: 'scripts', icon: Code, label: '脚本' },
  { id: 'security', icon: Shield, label: '安全' },
  { id: 'settings', icon: Settings, label: '设置' },
]

export default function Sidebar() {
  const { activeTab, setActiveTab, sidebarCollapsed, setSidebarCollapsed, connectionStatus } = useAppStore()

  return (
    <aside
      className={clsx(
        'flex flex-col bg-surface-0 border-r border-sep-subtle h-full transition-all duration-200',
        sidebarCollapsed ? 'w-[52px]' : 'w-[180px]',
      )}
    >
      {/* Logo */}
      <div className={clsx('flex items-center h-10 gap-2', sidebarCollapsed ? 'justify-center px-0' : 'px-3')}>
        <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center flex-shrink-0">
          <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        {!sidebarCollapsed && <span className="text-sm font-semibold text-fg tracking-tight">QTunnel</span>}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-1 space-y-0.5">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = activeTab === item.id
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={clsx(
                'w-full flex items-center rounded-md min-h-row transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                sidebarCollapsed ? 'justify-center px-0' : 'px-2 gap-2.5',
                isActive
                  ? 'bg-primary-tint text-primary font-medium'
                  : 'text-fg-2 hover:text-fg hover:bg-surface-1',
              )}
              title={sidebarCollapsed ? item.label : undefined}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {!sidebarCollapsed && <span className="text-sm">{item.label}</span>}
            </button>
          )
        })}
      </nav>

      {/* Status */}
      <div className={clsx('px-2 py-2', sidebarCollapsed && 'flex justify-center')}>
        <div className={clsx('flex items-center gap-2', sidebarCollapsed ? 'justify-center' : 'px-2')}>
          <span
            className={clsx(
              'w-2 h-2 rounded-full flex-shrink-0',
              connectionStatus === 'connected' && 'bg-success',
              connectionStatus === 'disconnected' && 'bg-fg-3',
              connectionStatus === 'checking' && 'bg-warning animate-pulse',
            )}
          />
          {!sidebarCollapsed && (
            <span className="text-xs text-fg-2">
              {connectionStatus === 'connected' ? '已连接' : connectionStatus === 'checking' ? '检查中' : '未连接'}
            </span>
          )}
        </div>
      </div>

      {/* Collapse toggle */}
      <div className="px-2 pb-2">
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="w-full flex items-center justify-center h-7 rounded-md text-fg-3 hover:text-fg hover:bg-surface-1 transition-colors"
        >
          {sidebarCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
        </button>
      </div>
    </aside>
  )
}
