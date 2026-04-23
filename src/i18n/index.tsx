import { createContext, useCallback, useContext, useEffect, useMemo } from 'react'
import { usePersisted } from '../lib/usePersisted'
import { DICTIONARIES, LOCALES, RTL_LOCALES, type Locale } from './dict'

export { LOCALES, RTL_LOCALES }
export type { Locale }

type TFn = (key: string, vars?: Record<string, string | number>) => string

type I18nContextType = {
  locale: Locale
  setLocale: (l: Locale) => void
  t: TFn
}

const I18nContext = createContext<I18nContextType | null>(null)

function detectInitial(): Locale {
  if (typeof navigator === 'undefined') return 'en'
  const raw = (navigator.language || 'en').toLowerCase()
  // exact match first (e.g. pt-br)
  const exact = LOCALES.find((l) => l.id.toLowerCase() === raw)
  if (exact) return exact.id
  // base match (e.g. "pt-pt" → pt-BR fallback since it's our only portuguese)
  const base = raw.split('-')[0]
  if (base === 'pt') return 'pt-BR'
  const baseMatch = LOCALES.find((l) => l.id.split('-')[0] === base)
  return baseMatch ? baseMatch.id : 'en'
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = usePersisted<Locale>('i18n.locale', detectInitial())

  useEffect(() => {
    const html = document.documentElement
    html.lang = locale
    html.dir = RTL_LOCALES.includes(locale) ? 'rtl' : 'ltr'
  }, [locale])

  const t = useCallback<TFn>(
    (key, vars) => {
      const dict = DICTIONARIES[locale] ?? DICTIONARIES.en
      let s = dict[key] ?? DICTIONARIES.en[key] ?? key
      if (vars) {
        for (const k in vars) {
          s = s.replace(new RegExp(`\\{${k}\\}`, 'g'), String(vars[k]))
        }
      }
      return s
    },
    [locale],
  )

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nContextType {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used inside <I18nProvider>')
  return ctx
}

export function useT(): TFn {
  return useI18n().t
}
