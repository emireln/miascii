import { useEffect, useRef, useState } from 'react'
import { Languages, Check } from 'lucide-react'
import { LOCALES, useI18n } from '../i18n'

export default function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const current = LOCALES.find((l) => l.id === locale) ?? LOCALES[0]

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={ref} className="lang-switch">
      <button
        type="button"
        className="pixel-btn pixel-btn--sm"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`${t('shell.language')}: ${current.native}`}
        title={t('shell.language')}
        onClick={() => setOpen((o) => !o)}
      >
        <Languages size={14} aria-hidden="true" />
        <span className="lang-code">{current.id}</span>
      </button>
      {open && (
        <div role="menu" aria-label={t('shell.language')} className="pixel-panel lang-menu">
          {LOCALES.map((l) => {
            const active = l.id === locale
            return (
              <button
                key={l.id}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                lang={l.id}
                className="lang-option"
                onClick={() => { setLocale(l.id); setOpen(false) }}
              >
                <span>{l.native}</span>
                <span className="lang-id">{l.id}</span>
                {active && <Check size={12} aria-hidden="true" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
