import clsx from 'clsx'

interface BadgeProps {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'primary'
  children: React.ReactNode
  dot?: boolean
  className?: string
}

export default function Badge({ variant = 'default', children, dot, className }: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium',
        variant === 'default' && 'bg-surface-1 text-fg-2',
        variant === 'success' && 'bg-success-tint text-success',
        variant === 'warning' && 'bg-warning-tint text-warning',
        variant === 'danger' && 'bg-danger-tint text-danger',
        variant === 'primary' && 'bg-primary-tint text-primary',
        className,
      )}
    >
      {dot && (
        <span
          className={clsx(
            'w-1.5 h-1.5 rounded-full',
            variant === 'success' && 'bg-success',
            variant === 'warning' && 'bg-warning',
            variant === 'danger' && 'bg-danger',
            variant === 'primary' && 'bg-primary',
            variant === 'default' && 'bg-fg-3',
          )}
        />
      )}
      {children}
    </span>
  )
}
