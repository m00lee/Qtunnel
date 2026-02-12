/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    fontSize: {
      xs: ['12px', { lineHeight: '1.4' }],
      sm: ['14px', { lineHeight: '1.5' }],
      base: ['16px', { lineHeight: '1.5' }],
      lg: ['20px', { lineHeight: '1.3' }],
    },
    extend: {
      colors: {
        canvas: 'var(--bg)',
        'surface-0': 'var(--surface-0)',
        'surface-1': 'var(--surface-1)',
        'surface-2': 'var(--surface-2)',
        fg: { DEFAULT: 'var(--text)', 2: 'var(--text-2)', 3: 'var(--text-3)' },
        sep: { DEFAULT: 'var(--border)', subtle: 'var(--border-subtle)' },
        primary: {
          DEFAULT: 'var(--primary)',
          hover: 'var(--primary-hover)',
          active: 'var(--primary-active)',
          text: 'var(--primary-text)',
          tint: 'var(--primary-tint)',
        },
        success: { DEFAULT: 'var(--success)', tint: 'var(--success-tint)' },
        warning: { DEFAULT: 'var(--warning)', tint: 'var(--warning-tint)' },
        danger: { DEFAULT: 'var(--danger)', tint: 'var(--danger-tint)' },
        ring: 'var(--ring)',
        overlay: 'var(--overlay)',
      },
      height: {
        ctrl: 'var(--ctrl-h)',
        'ctrl-sm': 'var(--ctrl-h-sm)',
        row: 'var(--row-h)',
        titlebar: 'var(--titlebar-h)',
      },
      minHeight: {
        ctrl: 'var(--ctrl-h)',
        row: 'var(--row-h)',
      },
      borderRadius: {
        DEFAULT: '6px',
        md: '8px',
        lg: '10px',
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'system-ui', 'Segoe UI', 'sans-serif'],
        mono: ['SF Mono', 'JetBrains Mono', 'Menlo', 'monospace'],
      },
      boxShadow: {
        xs: '0 1px 2px rgba(0,0,0,0.04)',
        sm: '0 1px 3px rgba(0,0,0,0.06)',
        md: '0 4px 12px rgba(0,0,0,0.08)',
        modal: '0 24px 60px rgba(0,0,0,0.2)',
      },
    },
  },
  plugins: [],
}
