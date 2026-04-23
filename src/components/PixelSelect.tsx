import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Check, Search } from 'lucide-react'
import { cn } from '../lib/cn'

type Props = {
  value: string
  onChange: (v: string) => void
  options: readonly string[]
  searchable?: boolean
  placeholder?: string
  /** Optional display mapper so options can be translated without changing stable IDs */
  labelOf?: (value: string) => string
}

export default function PixelSelect({
  value,
  onChange,
  options,
  searchable = true,
  placeholder = 'select...',
  labelOf,
}: Props) {
  const display = (v: string) => (labelOf ? labelOf(v) : v)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [hover, setHover] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  useEffect(() => {
    if (open) {
      setQuery('')
      setHover(Math.max(0, options.indexOf(value)))
    }
  }, [open, options, value])

  const filtered = searchable && query
    ? options.filter((o) => {
        const q = query.toLowerCase()
        return o.toLowerCase().includes(q) || display(o).toLowerCase().includes(q)
      })
    : options

  useEffect(() => {
    if (!open) return
    const el = listRef.current?.querySelector<HTMLButtonElement>(`[data-idx="${hover}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [hover, open])

  function pick(v: string) {
    onChange(v)
    setOpen(false)
  }

  function onKey(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHover((h) => Math.min(filtered.length - 1, h + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHover((h) => Math.max(0, h - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (filtered[hover]) pick(filtered[hover])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div ref={rootRef} className="relative" onKeyDown={onKey}>
      <button
        type="button"
        className="pixel-btn w-full justify-between"
        data-active={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="truncate text-left">{value ? display(value) : placeholder}</span>
        <ChevronDown
          size={14}
          style={{
            transform: open ? 'rotate(180deg)' : 'none',
            transition: 'transform 80ms ease',
          }}
        />
      </button>

      {open && (
        <div
          className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 pixel-panel"
          style={{ background: 'var(--bg)' }}
        >
          {searchable && (
            <div
              className="flex items-center gap-2 px-2 py-1.5"
              style={{ borderBottom: '2px solid var(--fg)' }}
            >
              <Search size={12} />
              <input
                autoFocus
                value={query}
                onChange={(e) => { setQuery(e.target.value); setHover(0) }}
                placeholder="search..."
                className="flex-1 bg-transparent outline-none font-mono text-base"
                spellCheck={false}
              />
            </div>
          )}
          <div
            ref={listRef}
            className="max-h-56 overflow-auto"
            style={{ background: 'var(--bg)' }}
          >
            {filtered.length === 0 && (
              <div className="px-3 py-2 text-[var(--dim)] text-sm">// no matches</div>
            )}
            {filtered.map((o, i) => {
              const selected = o === value
              const active = i === hover
              return (
                <button
                  type="button"
                  key={o}
                  data-idx={i}
                  onMouseEnter={() => setHover(i)}
                  onClick={() => pick(o)}
                  className={cn(
                    'w-full text-left px-3 py-1 font-mono text-lg flex items-center justify-between gap-2 cursor-pointer',
                  )}
                  style={{
                    background: active ? 'var(--fg)' : 'transparent',
                    color: active ? 'var(--bg)' : 'var(--fg)',
                  }}
                >
                  <span className="truncate">
                    <span style={{ opacity: 0.5 }}>{active ? '>' : ' '} </span>
                    {display(o)}
                  </span>
                  {selected && <Check size={12} />}
                </button>
              )
            })}
          </div>
          <div
            className="px-2 py-1 text-[var(--dim)] text-sm flex justify-between"
            style={{ borderTop: '2px solid var(--fg)' }}
          >
            <span>↑↓ navigate · ↵ pick · esc</span>
            <span>{filtered.length}/{options.length}</span>
          </div>
        </div>
      )}
    </div>
  )
}
