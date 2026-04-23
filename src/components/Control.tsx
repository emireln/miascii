import { cn } from '../lib/cn'

export function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('font-pixel text-[10px] uppercase tracking-widest text-[var(--mid)] mb-2', className)}>
      {children}
    </div>
  )
}

export function Select({
  value,
  onChange,
  options,
}: {
  value: string
  onChange: (v: string) => void
  options: readonly string[]
}) {
  return (
    <div className="pixel-panel !shadow-none">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-transparent text-[var(--fg)] px-2 py-1.5 outline-none font-mono text-lg appearance-none cursor-pointer"
        style={{ border: 'none' }}
      >
        {options.map((o) => (
          <option key={o} value={o} style={{ background: 'var(--bg)', color: 'var(--fg)' }}>
            {o}
          </option>
        ))}
      </select>
    </div>
  )
}

export function Slider({
  value,
  onChange,
  min,
  max,
  step = 1,
}: {
  value: number
  onChange: (v: number) => void
  min: number
  max: number
  step?: number
}) {
  return (
    <div className="flex items-center gap-3">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1 accent-[var(--fg)]"
      />
      <span className="font-mono text-lg w-12 text-right text-[var(--fg)]">{value}</span>
    </div>
  )
}

export function Toggle({
  value,
  onChange,
  label,
}: {
  value: boolean
  onChange: (v: boolean) => void
  label: string
}) {
  return (
    <button
      className="pixel-btn w-full justify-between"
      data-active={value}
      onClick={() => onChange(!value)}
    >
      <span>{label}</span>
      <span>[{value ? 'x' : ' '}]</span>
    </button>
  )
}
