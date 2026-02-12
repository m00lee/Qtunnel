'use client'

import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import clsx from 'clsx'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  subtitle?: string
  children: React.ReactNode
  footer?: React.ReactNode
  width?: 'sm' | 'md' | 'lg' | 'xl'
}

export default function Modal({ isOpen, onClose, title, subtitle, children, footer, width = 'md' }: ModalProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in">
      <div className="absolute inset-0 bg-overlay" onClick={onClose} />
      <div
        ref={ref}
        className={clsx(
          'relative bg-surface-0 rounded-lg shadow-modal animate-scale-in',
          'max-h-[80vh] flex flex-col mx-4',
          width === 'sm' && 'w-full max-w-sm',
          width === 'md' && 'w-full max-w-md',
          width === 'lg' && 'w-full max-w-lg',
          width === 'xl' && 'w-full max-w-2xl',
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-sep-subtle flex-shrink-0">
          <div>
            <h2 className="text-sm font-semibold text-fg">{title}</h2>
            {subtitle && <p className="text-xs text-fg-2 mt-0.5">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-fg-3 hover:text-fg hover:bg-surface-1 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="px-5 py-4 overflow-y-auto flex-1">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-sep-subtle flex-shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
