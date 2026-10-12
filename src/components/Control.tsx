import { useEffect, useState, type ReactNode } from 'react'
import { cn } from '../lib/cn'

const HEX = /^#[0-9a-f]{6}$/i

export function Label({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('pixel-label mb-2', className)}>{children}</div>
}

/** A titled group of related controls inside the controls panel. */
export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="ctl-section">
      <h2 className="pixel-label ctl-title">{title}</h2>
      <div className="ctl-body">{children}</div>
    </section>
  )
}

export function Slider({
  value,
  onChange,
  min,
  max,
  step = 1,
  label,
}: {
  value: number
  onChange: (v: number) => void
  min: number
  max: number
  step?: number
  label?: string
}) {
  return (
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      aria-label={label}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full"
    />
  )
}

export function Toggle({
  value,
  onChange,
  label,
  disabled = false,
}: {
  value: boolean
  onChange: (v: boolean) => void
  label: string
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      disabled={disabled}
      className="control-toggle"
      data-active={value}
      onClick={() => onChange(!value)}
    >
      <span>{label}</span>
      <span className="switch-track" aria-hidden="true" />
    </button>
  )
}

/** Hex text box beside a swatch that opens the native color picker. */
export function ColorField({
  label,
  value,
  onChange,
  pickLabel,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  pickLabel: string
}) {
  const [draft, setDraft] = useState(value)
  // A picker or preset change arrives as a new value: mirror it into the text box.
  useEffect(() => setDraft(value), [value])

  const commit = (v: string) => {
    setDraft(v)
    if (HEX.test(v)) onChange(v)
  }

  return (
    <div className="color-field">
      <span className="pixel-label">{label}</span>
      <div className="color-row">
        <label className="swatch-pick" title={pickLabel}>
          <span className="swatch" aria-hidden="true" style={{ background: HEX.test(draft) ? draft : 'transparent' }} />
          <input
            type="color"
            className="sr-only"
            value={HEX.test(value) ? value : '#000000'}
            aria-label={`${label}: ${pickLabel}`}
            onChange={(e) => commit(e.target.value)}
          />
        </label>
        <input
          className="pixel-input color-hex"
          value={draft}
          maxLength={7}
          spellCheck={false}
          aria-label={`${label} hex`}
          onChange={(e) => commit(e.target.value)}
        />
      </div>
    </div>
  )
}
