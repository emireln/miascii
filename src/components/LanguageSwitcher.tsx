import { useEffect, useRef, useState } from 'react'
import { Languages, Check } from 'lucide-react'
import { LOCALES, useI18n } from '../i18n'
import { cn } from '../lib/cn'

export default function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (!ref.current) return
      if (!ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const current = LOCALES.find((l) => l.id === locale) ?? LOCALES[0]

  return (
    <div ref={ref} className="relative">
      <button
        className="pixel-btn !px-2 !py-1"
        onClick={() => setOpen((o) => !o)}
        aria-label={t('shell.language')}
        title={t('shell.language')}
      >
        <Languages size={14} />
        <span className="text-sm uppercase tracking-wide">{current.id}</span>
      </button>
      {open && (
        <div
          className="absolute right-0 mt-1 z-50 pixel-panel !p-0 min-w-[180px] max-h-[320px] overflow-auto"
          style={{ background: 'var(--panel)' }}
        >
          {LOCALES.map((l) => {
            const active = l.id === locale
            return (
              <button
                key={l.id}
                className={cn(
                  'w-full flex items-center justify-between gap-2 px-3 py-1.5 text-left text-sm',
                  'hover:bg-[var(--fg)] hover:text-[var(--bg)]',
                )}
                onClick={() => { setLocale(l.id); setOpen(false) }}
              >
                <span>
                  <span className="font-medium">{l.native}</span>
                  <span className="text-[var(--dim)] text-xs ml-2 uppercase">{l.id}</span>
                </span>
                {active && <Check size={12} />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
