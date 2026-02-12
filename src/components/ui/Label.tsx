import React from 'react'
import clsx from 'clsx'

interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {}

export default function Label({ className, children, ...props }: LabelProps) {
  return (
    <label
      className={clsx('block text-xs font-medium text-muted-foreground mb-1.5', className)}
      {...props}
    >
      {children}
    </label>
  )
}
