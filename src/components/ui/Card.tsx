import React from 'react'
import clsx from 'clsx'

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hover?: boolean
}

export default function Card({ className, hover = false, children, ...props }: CardProps) {
  return (
    <div
      className={clsx(
        'bg-card border border-border-subtle rounded-2xl',
        'transition-all duration-200 ease-spring',
        hover && 'hover:bg-card-hover hover:shadow-card-hover hover:border-border',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
