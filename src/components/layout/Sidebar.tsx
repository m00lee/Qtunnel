'use client'

import { useAppStore } from '@/lib/store'
import { Globe, Zap, Shield, Settings, ChevronLeft, ChevronRight, Code } from 'lucide-react'
import clsx from 'clsx'

const navItems = [
  { id: 'tunnels', icon: Globe, label: '隧道' },
  { id: 'services', icon: Zap, label: '服务' },
  { id: 'scripts', icon: Code, label: '脚本' },
  { id: 'security', icon: Shield, label: '安全' },
  { id: 'settings', icon: Settings, label: '设置' },
]

export default function Sidebar() {
  const { activeTab, setActiveTab, sidebarCollapsed, setSidebarCollapsed, connectionStatus } = useAppStore()

  const statusConfig = {
    connected: { dot: 'bg-success', text: 'text-success', label: '已连接', pulse: true },
    disconnected: { dot: 'bg-muted-foreground', text: 'text-muted-foreground', label: '未连接', pulse: false },
    checking: { dot: 'bg-warning', text: 'text-warning', label: '检查中', pulse: true },
  }
  const status = statusConfig[connectionStatus]

  return (
    <>
    <aside
      className={clsx(
        'hidden md:flex flex-col bg-sidebar border-r border-border-subtle h-full',
        'transition-all duration-300 ease-spring relative',
        sidebarCollapsed ? 'w-[68px]' : 'w-[200px]'
      )}
    >
      {/* Logo */}
      <div className="flex items-center h-14 px-4 border-b border-border-subtle">
        <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center flex-shrink-0">
          <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        {!sidebarCollapsed && (
          <div className="ml-3 animate-fade-in">
            <span className="font-semibold text-sm text-foreground tracking-tight">QTunnel</span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 px-3 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = activeTab === item.id
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={clsx(
                'w-full flex items-center rounded-xl transition-all duration-200',
                sidebarCollapsed ? 'justify-center px-0 py-2.5' : 'px-3 py-2.5 gap-3',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                isActive
                  ? 'bg-sidebar-active text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-card-hover'
              )}
              title={sidebarCollapsed ? item.label : undefined}
            >
              <Icon className={clsx('w-[18px] h-[18px] flex-shrink-0', isActive && 'drop-shadow-sm')} />
              {!sidebarCollapsed && (
                <span className="text-[13px] font-medium animate-fade-in">{item.label}</span>
              )}
            </button>
          )
        })}
      </nav>

      {/* Status indicator */}
      <div className={clsx('px-3 pb-3', sidebarCollapsed && 'flex justify-center')}>
        <div
          className={clsx(
            'flex items-center rounded-xl py-2',
            sidebarCollapsed ? 'justify-center px-0' : 'px-3 gap-2'
          )}
        >
          <div className={`w-2 h-2 rounded-full ${status.dot} flex-shrink-0 ${status.pulse ? 'animate-pulse' : ''}`} />
          {!sidebarCollapsed && (
            <span className={`text-xs ${status.text} font-medium animate-fade-in`}>{status.label}</span>
          )}
        </div>
      </div>

      {/* Collapse toggle */}
      <div className="px-3 pb-3">
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="w-full flex items-center justify-center py-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-card-hover transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {sidebarCollapsed
            ? <ChevronRight className="w-4 h-4" />
            : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>
    </aside>

      {/* Mobile bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex md:hidden items-center justify-around bg-sidebar border-t border-border-subtle px-1 pb-[env(safe-area-inset-bottom)]">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = activeTab === item.id
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={clsx(
                'flex flex-col items-center gap-0.5 py-2 px-3 rounded-xl transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground'
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          )
        })}
      </nav>
    </>
  )
}
