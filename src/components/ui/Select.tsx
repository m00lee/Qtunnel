import React from 'react'
import clsx from 'clsx'

interface SelectOption {
  value: string
  label: string
}

interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
  options: SelectOption[]
}

export default function Select({ options, className, ...props }: SelectProps) {
  return (
    <select
      className={clsx(
        'w-full px-3.5 py-2 rounded-xl text-sm',
        'bg-input border border-border-subtle text-foreground',
        'focus:outline-none focus:border-primary focus:ring-1 focus:ring-ring',
        'focus-visible:ring-2 focus-visible:ring-ring',
        'transition-all duration-200',
        'disabled:opacity-40 disabled:pointer-events-none',
        className
      )}
      {...props}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  )
}
