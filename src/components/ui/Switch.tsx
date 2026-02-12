import clsx from 'clsx'

interface SwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
}

export default function Switch({ checked, onChange, disabled }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={clsx(
        'relative w-[38px] h-[22px] rounded-full transition-colors duration-200 flex-shrink-0',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        'disabled:opacity-40 disabled:cursor-not-allowed',
        checked ? 'bg-primary' : 'bg-surface-2',
      )}
    >
      <span
        className={clsx(
          'absolute top-[2px] left-[2px] w-[18px] h-[18px] rounded-full bg-white shadow-sm',
          'transition-transform duration-200',
          checked && 'translate-x-4',
        )}
      />
    </button>
  )
}
