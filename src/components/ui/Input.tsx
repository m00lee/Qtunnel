import { forwardRef } from 'react'
import clsx from 'clsx'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  leftIcon?: React.ReactNode
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ leftIcon, className, ...props }, ref) => (
    <div className="relative">
      {leftIcon && (
        <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-3 pointer-events-none">
          {leftIcon}
        </div>
      )}
      <input
        ref={ref}
        className={clsx(
          'w-full h-ctrl rounded-md border border-sep bg-surface-0 px-3 text-sm text-fg',
          'placeholder:text-fg-3 transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary',
          'disabled:opacity-40 disabled:cursor-not-allowed',
          leftIcon && 'pl-8',
          className,
        )}
        {...props}
      />
    </div>
  ),
)

Input.displayName = 'Input'
export default Input
