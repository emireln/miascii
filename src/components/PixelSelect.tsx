import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Check, Search } from 'lucide-react'
import { cn } from '../lib/cn'
import { useT } from '../i18n'

type Props = {
  value: string
  onChange: (v: string) => void
  options: readonly string[]
  /** Accessible name for the picker. */
  label?: string
  searchable?: boolean
  placeholder?: string
  /** Optional display mapper so options can be translated without changing stable IDs */
  labelOf?: (value: string) => string
}

type Placement = { left: number; width: number; maxHeight: number; top?: number; bottom?: number }

// Height the full menu wants (search + list + footer). Used to pick a side.
const MENU_HEIGHT = 340

/**
 * Listbox picker in the ARIA combobox pattern. The menu is portalled to the
 * body so a scrolling controls panel can't clip it.
 */
export default function PixelSelect({
  value,
  onChange,
  options,
  label,
  searchable = true,
  placeholder = '',
  labelOf,
}: Props) {
  const t = useT()
  const id = useId()
  const display = (v: string) => (labelOf ? labelOf(v) : v)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const [placement, setPlacement] = useState<Placement | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const filtered = searchable && query
    ? options.filter((o) => {
        const q = query.toLowerCase()
        return o.toLowerCase().includes(q) || display(o).toLowerCase().includes(q)
      })
    : options

  // Measure the trigger and open in the same event, so the menu mounts already
  // placed and its inputs exist when the focus effect below runs.
  const place = () => {
    const r = triggerRef.current?.getBoundingClientRect()
    if (!r) return
    const roomBelow = window.innerHeight - r.bottom - 12
    const roomAbove = r.top - 12
    if (roomBelow >= MENU_HEIGHT || roomBelow >= roomAbove) {
      setPlacement({ left: r.left, width: r.width, top: r.bottom + 6, maxHeight: Math.max(120, roomBelow) })
    } else {
      setPlacement({ left: r.left, width: r.width, bottom: window.innerHeight - r.top + 6, maxHeight: Math.max(120, roomAbove) })
    }
  }

  const openMenu = () => {
    place()
    setOpen(true)
  }

  // On open: clear the search, highlight the current value, and move focus in.
  // Keyed on `open` alone, so a parent re-render can't wipe what is being typed.
  useEffect(() => {
    if (!open) return
    setQuery('')
    setActive(Math.max(0, options.indexOf(value)))
    if (searchable) searchRef.current?.focus()
    else listRef.current?.focus()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Keep the menu attached to the trigger while the page scrolls or resizes.
  // `place` only reads refs, so subscribing once per open is enough.
  useEffect(() => {
    if (!open) return
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node
      if (!triggerRef.current?.contains(target) && !menuRef.current?.contains(target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  useEffect(() => {
    if (!open) return
    listRef.current?.querySelector<HTMLElement>(`[data-idx="${active}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [active, open])

  const close = (returnFocus: boolean) => {
    setOpen(false)
    if (returnFocus) triggerRef.current?.focus()
  }

  const pick = (v: string) => {
    onChange(v)
    close(true)
  }

  // Bound on the wrapper: the menu is portalled, but React events still bubble here.
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault()
        openMenu()
      }
      return
    }
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setActive((i) => Math.min(filtered.length - 1, i + 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setActive((i) => Math.max(0, i - 1))
        break
      case 'Home':
        e.preventDefault()
        setActive(0)
        break
      case 'End':
        e.preventDefault()
        setActive(Math.max(0, filtered.length - 1))
        break
      case 'Enter':
        e.preventDefault()
        if (filtered[active] !== undefined) pick(filtered[active])
        break
      case 'Escape':
        e.preventDefault()
        close(true)
        break
      case 'Tab':
        close(false)
        break
    }
  }

  const current = value ? display(value) : placeholder
  const activeId = filtered.length ? `${id}-${active}` : undefined

  const menu = open && placement
    ? createPortal(
      <div
        ref={menuRef}
        className="pixel-panel pixel-select-menu"
        style={{
          left: placement.left,
          width: placement.width,
          top: placement.top,
          bottom: placement.bottom,
          maxHeight: placement.maxHeight,
        }}
      >
        {searchable && (
          <div className="pixel-select-search">
            <Search size={14} aria-hidden="true" />
            <input
              ref={searchRef}
              className="pixel-input"
              value={query}
              placeholder={t('picker.search')}
              aria-label={t('picker.search')}
              aria-controls={`${id}-list`}
              aria-activedescendant={activeId}
              autoComplete="off"
              spellCheck={false}
              onChange={(e) => { setQuery(e.target.value); setActive(0) }}
            />
          </div>
        )}
        <div
          ref={listRef}
          id={`${id}-list`}
          role="listbox"
          aria-label={label ?? placeholder}
          aria-activedescendant={activeId}
          tabIndex={-1}
          className="pixel-select-list"
        >
          {filtered.length === 0 && <div className="pixel-select-empty">{t('picker.noMatches')}</div>}
          {filtered.map((o, i) => (
            <div
              key={o}
              id={`${id}-${i}`}
              role="option"
              aria-selected={o === value}
              data-idx={i}
              className={cn('pixel-select-option', i === active && 'is-active')}
              onMouseEnter={() => setActive(i)}
              onClick={() => pick(o)}
            >
              <span className="truncate">{display(o)}</span>
              {o === value && <Check size={12} aria-hidden="true" />}
            </div>
          ))}
        </div>
        <div className="pixel-select-foot">
          <span>{t('picker.hint')}</span>
          <span>{filtered.length}/{options.length}</span>
        </div>
      </div>,
      document.body,
    )
    : null

  return (
    <div className="pixel-select" onKeyDown={onKeyDown}>
      <button
        ref={triggerRef}
        type="button"
        className="pixel-btn pixel-select-trigger"
        aria-label={label ? `${label}: ${current}` : undefined}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? `${id}-list` : undefined}
        data-active={open}
        onClick={() => (open ? setOpen(false) : openMenu())}
      >
        <span className="pixel-select-value">{current}</span>
        <ChevronDown size={14} aria-hidden="true" className={cn('pixel-select-chevron', open && 'is-open')} />
      </button>
      {menu}
    </div>
  )
}
