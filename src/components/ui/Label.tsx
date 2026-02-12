export default function Label({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <label className={`block text-xs font-medium text-fg-2 mb-1 ${className}`}>{children}</label>
}
