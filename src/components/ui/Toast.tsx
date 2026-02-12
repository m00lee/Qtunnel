'use client'

import { useEffect, useRef } from 'react'
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react'
import { useToastStore, type Toast as ToastItem } from '@/lib/toast'
import clsx from 'clsx'

const icons = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
}

const styles = {
  success: 'border-l-success bg-success-tint text-success',
  error: 'border-l-danger bg-danger-tint text-danger',
  warning: 'border-l-warning bg-warning-tint text-warning',
  info: 'border-l-primary bg-primary-tint text-primary',
}

function ToastEntry({ toast, onRemove }: { toast: ToastItem; onRemove: () => void }) {
  const Icon = icons[toast.type]
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Trigger enter animation
    requestAnimationFrame(() => {
      if (ref.current) ref.current.style.transform = 'translateY(0)'
    })
  }, [])

  return (
    <div
      ref={ref}
      className={clsx(
        'flex items-center gap-2.5 px-4 py-2.5 rounded-md border-l-[3px] shadow-md backdrop-blur-sm',
        'bg-surface-0/95 transition-all duration-200 ease-out',
        'transform translate-y-2',
        styles[toast.type],
      )}
      style={{ transform: 'translateY(8px)' }}
    >
      <Icon className="w-4 h-4 flex-shrink-0" />
      <span className="text-sm text-fg flex-1 min-w-0">{toast.message}</span>
      <button
        onClick={onRemove}
        className="p-0.5 rounded text-fg-3 hover:text-fg transition-colors flex-shrink-0"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  )
}

export default function ToastContainer() {
  const { toasts, removeToast } = useToastStore()

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[9999] flex flex-col-reverse gap-2 pointer-events-none min-w-[320px] max-w-[520px]">
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto animate-slide-up">
          <ToastEntry toast={t} onRemove={() => removeToast(t.id)} />
        </div>
      ))}
    </div>
  )
}
