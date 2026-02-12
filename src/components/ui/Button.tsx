import React from 'react'
import clsx from 'clsx'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  icon?: React.ReactNode
}

export default function Button({
  className,
  variant = 'primary',
  size = 'md',
  icon,
  children,
  ...props
}: ButtonProps) {
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs gap-1.5',
    md: 'px-4 py-2 text-sm gap-2',
    lg: 'px-5 py-2.5 text-sm gap-2',
  }

  const variantClasses = {
    primary:
      'bg-primary text-primary-foreground hover:brightness-110 shadow-sm hover:shadow-md active:brightness-95',
    secondary:
      'bg-surface text-foreground hover:bg-card-hover border border-border-subtle',
    danger:
      'bg-danger text-white hover:brightness-110 shadow-sm',
    ghost:
      'text-muted-foreground hover:text-foreground hover:bg-card-hover',
  }

  return (
    <button
      className={clsx(
        'inline-flex items-center justify-center rounded-xl font-medium',
        'transition-all duration-200 ease-spring',
        'disabled:opacity-40 disabled:pointer-events-none',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background',
        'active:scale-[0.97]',
        sizeClasses[size],
        variantClasses[variant],
        className
      )}
      {...props}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      {children}
    </button>
  )
}
