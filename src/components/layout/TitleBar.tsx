'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { Minus, Maximize2, Copy, X, Moon, Sun } from 'lucide-react'
import { useAppStore } from '@/lib/store'

type TauriWindow = Awaited<ReturnType<typeof import('@tauri-apps/api/window').getCurrentWindow>>

export default function TitleBar() {
  const { theme, setTheme } = useAppStore()
  const [isMac, setIsMac] = useState(false)
  const [maximized, setMaximized] = useState(false)
  const winRef = useRef<TauriWindow | null>(null)

  // Cache the window reference once
  const getWin = useCallback(async (): Promise<TauriWindow | null> => {
    if (winRef.current) return winRef.current
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window')
      const w = getCurrentWindow()
      winRef.current = w
      return w
    } catch {
      return null
    }
  }, [])

  useEffect(() => {
    setIsMac(navigator.platform?.startsWith('Mac') ?? false)
    getWin().then(async (w) => {
      if (w) {
        try { setMaximized(await w.isMaximized()) } catch {}
      }
    })
  }, [getWin])

  const handleMinimize = async () => {
    const w = await getWin()
    if (w) try { await w.minimize() } catch {}
  }

  const handleToggleMaximize = async () => {
    const w = await getWin()
    if (w) try {
      await w.toggleMaximize()
      setMaximized(await w.isMaximized())
    } catch {}
  }

  const handleClose = async () => {
    const w = await getWin()
    if (w) try { await w.close() } catch {}
  }

  // Explicit drag via mousedown — works reliably on Linux/GNOME
  const handleDragStart = async (e: React.MouseEvent) => {
    // Only drag on left-click, skip if clicking a button/input
    if (e.button !== 0) return
    const target = e.target as HTMLElement
    if (target.closest('button') || target.closest('input') || target.closest('a')) return
    const w = await getWin()
    if (w) try { await w.startDragging() } catch {}
  }

  // Double-click to toggle maximize
  const handleDoubleClick = async (e: React.MouseEvent) => {
    const target = e.target as HTMLElement
    if (target.closest('button')) return
    await handleToggleMaximize()
  }

  return (
    <div
      data-tauri-drag-region
      onMouseDown={handleDragStart}
      onDoubleClick={handleDoubleClick}
      className="h-titlebar flex items-center bg-surface-0 border-b border-sep-subtle select-none flex-shrink-0"
    >
      {/* macOS traffic lights */}
      {isMac && (
        <div className="flex items-center gap-2 ml-3 z-10">
          <button onClick={handleClose} className="w-3 h-3 rounded-full bg-[#ff5f57] hover:brightness-90 transition" />
          <button onClick={handleMinimize} className="w-3 h-3 rounded-full bg-[#febc2e] hover:brightness-90 transition" />
          <button onClick={handleToggleMaximize} className="w-3 h-3 rounded-full bg-[#28c840] hover:brightness-90 transition" />
        </div>
      )}

      {/* Spacer — also draggable */}
      <div className="flex-1" />

      {/* App title */}
      <span className="text-xs font-medium text-fg-3 absolute left-1/2 -translate-x-1/2 pointer-events-none">
        QTunnel
      </span>

      {/* Right actions */}
      <div className="flex items-center mr-1 z-10">
        <button
          onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
          className="p-1.5 rounded-md text-fg-3 hover:text-fg hover:bg-surface-1 transition-colors"
        >
          {theme === 'light' ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Windows/Linux controls */}
      {!isMac && (
        <div className="flex items-center">
          <button onClick={handleMinimize} className="h-titlebar w-11 flex items-center justify-center text-fg-3 hover:bg-surface-1 transition-colors">
            <Minus className="w-3.5 h-3.5" />
          </button>
          <button onClick={handleToggleMaximize} className="h-titlebar w-11 flex items-center justify-center text-fg-3 hover:bg-surface-1 transition-colors">
            {maximized ? <Copy className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
          </button>
          <button onClick={handleClose} className="h-titlebar w-11 flex items-center justify-center text-fg-3 hover:bg-danger hover:text-white transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  )
}
