import React from 'react'
import clsx from 'clsx'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

export default function Input({ className, leftIcon, rightIcon, ...props }: InputProps) {
  return (
    <div className="relative">
      {leftIcon && (
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
          {leftIcon}
        </div>
      )}
      <input
        className={clsx(
          'w-full px-3.5 py-2 rounded-xl text-sm',
          'bg-input border border-border-subtle text-foreground',
          'placeholder:text-muted-foreground',
          'focus:outline-none focus:border-primary focus:ring-1 focus:ring-ring',
          'focus-visible:ring-2 focus-visible:ring-ring',
          'transition-all duration-200',
          'disabled:opacity-40 disabled:pointer-events-none',
          leftIcon && 'pl-9',
          rightIcon && 'pr-9',
          className
        )}
        {...props}
      />
      {rightIcon && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
          {rightIcon}
        </div>
      )}
    </div>
  )
}
