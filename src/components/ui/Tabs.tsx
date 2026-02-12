import clsx from 'clsx'

interface TabsProps {
  tabs: { id: string; label: string }[]
  activeTab: string
  onChange: (id: string) => void
}

export default function Tabs({ tabs, activeTab, onChange }: TabsProps) {
  return (
    <div className="inline-flex items-center gap-0.5 p-0.5 rounded-md bg-surface-1">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={clsx(
            'px-3 h-ctrl-sm rounded text-xs font-medium transition-all select-none',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            activeTab === tab.id
              ? 'bg-surface-0 text-fg shadow-xs'
              : 'text-fg-2 hover:text-fg',
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
