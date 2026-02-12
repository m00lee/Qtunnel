import { create } from 'zustand'

export interface PermissionState {
  checked: boolean
  tunnels: boolean
  dns: boolean
  firewall: boolean
  zones: boolean
}

interface AppState {
  activeTab: string
  setActiveTab: (tab: string) => void
  theme: 'light' | 'dark'
  setTheme: (theme: 'light' | 'dark') => void
  density: 'comfortable' | 'compact'
  setDensity: (d: 'comfortable' | 'compact') => void
  sidebarCollapsed: boolean
  setSidebarCollapsed: (collapsed: boolean) => void
  connectionStatus: 'connected' | 'disconnected' | 'checking'
  setConnectionStatus: (status: 'connected' | 'disconnected' | 'checking') => void
  permissions: PermissionState
  setPermissions: (p: PermissionState) => void
}

export const useAppStore = create<AppState>((set) => ({
  activeTab: 'tunnels',
  setActiveTab: (tab) => set({ activeTab: tab }),
  theme: 'dark',
  setTheme: (theme) => set({ theme }),
  density: 'comfortable',
  setDensity: (density) => set({ density }),
  sidebarCollapsed: false,
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  connectionStatus: 'disconnected',
  setConnectionStatus: (status) => set({ connectionStatus: status }),
  permissions: { checked: false, tunnels: true, dns: true, firewall: true, zones: true },
  setPermissions: (permissions) => set({ permissions }),
}))
