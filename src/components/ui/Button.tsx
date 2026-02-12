import { forwardRef } from 'react'
import clsx from 'clsx'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'default'
  icon?: React.ReactNode
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'secondary', size = 'default', icon, children, className, disabled, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled}
      className={clsx(
        'inline-flex items-center justify-center gap-1.5 font-medium rounded-md transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
        'disabled:opacity-40 disabled:pointer-events-none select-none',
        size === 'sm' ? 'h-ctrl-sm px-2.5 text-xs' : 'h-ctrl px-3 text-sm',
        variant === 'primary' && 'bg-primary text-primary-text hover:bg-primary-hover active:bg-primary-active',
        variant === 'secondary' && 'bg-surface-1 text-fg border border-sep hover:bg-surface-2',
        variant === 'ghost' && 'text-fg-2 hover:bg-surface-1 hover:text-fg',
        variant === 'danger' && 'bg-danger text-white hover:opacity-90',
        className,
      )}
      {...props}
    >
      {icon}
      {children}
    </button>
  ),
)

Button.displayName = 'Button'
export default Button
