import clsx from 'clsx'

interface CardProps {
  children: React.ReactNode
  className?: string
  hover?: boolean
}

export default function Card({ children, className, hover }: CardProps) {
  return (
    <div
      className={clsx(
        'rounded-lg bg-surface-0 border border-sep-subtle',
        hover && 'transition-colors hover:border-sep',
        className,
      )}
    >
      {children}
    </div>
  )
}
