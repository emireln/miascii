import { useEffect, useState } from 'react'
import {
  Type, Image as ImageIcon, Video, Sun, Moon, Terminal,
  PanelLeftClose, PanelLeftOpen, Settings as SettingsIcon,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '../lib/cn'
import { usePersisted } from '../lib/usePersisted'
import { normalizeTheme, THEMES, type ThemeId } from '../lib/themes'
import { useT } from '../i18n'
import LanguageSwitcher from './LanguageSwitcher'
import SettingsPanel from './SettingsPanel'

export type Mode = 'text' | 'image' | 'video'

type Props = {
  mode: Mode
  onMode: (m: Mode) => void
  children: React.ReactNode
}

const MODES: { id: Mode; labelKey: string; icon: LucideIcon }[] = [
  { id: 'text', labelKey: 'shell.mode.text', icon: Type },
  { id: 'image', labelKey: 'shell.mode.image', icon: ImageIcon },
  { id: 'video', labelKey: 'shell.mode.video', icon: Video },
]

export default function Shell({ mode, onMode, children }: Props) {
  const t = useT()
  const [themeRaw, setTheme] = usePersisted<ThemeId>('shell.theme', 'default-dark')
  const theme: ThemeId = normalizeTheme(themeRaw)
  const [navOpen, setNavOpen] = usePersisted<boolean>('shell.navOpen', true)
  const [settingsOpen, setSettingsOpen] = useState(false)

  useEffect(() => {
    const root = document.documentElement
    root.dataset.theme = theme
    // Legacy .light class kept in sync for any older selectors still using it
    const def = THEMES.find((t) => t.id === theme)
    if (def?.mode === 'light') root.classList.add('light')
    else root.classList.remove('light')
  }, [theme])

  const [clock, setClock] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setClock(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const time = clock.toTimeString().slice(0, 8)

  return (
    <div className="crt h-full w-full flex flex-col">
      {/* Top bar */}
      <header className="flex items-center justify-between px-4 py-2 border-b-2 border-[var(--fg)]">
        <div className="flex items-center gap-3">
          <button
            className="pixel-btn !px-2 !py-1"
            onClick={() => setNavOpen((o) => !o)}
            aria-label={navOpen ? t('shell.hideSidebar') : t('shell.showSidebar')}
            title={navOpen ? t('shell.hideSidebar') : t('shell.showSidebar')}
          >
            {navOpen ? <PanelLeftClose size={14} /> : <PanelLeftOpen size={14} />}
          </button>
          <Terminal size={18} />
          <span className="font-pixel text-[11px] tracking-widest uppercase">miascii</span>
          <span className="text-[var(--dim)] text-base">v2.1</span>
        </div>
        <div className="flex items-center gap-3 text-[var(--mid)]">
          <span className="glow">{time}</span>
          <LanguageSwitcher />
          <button
            className="pixel-btn !px-2 !py-1"
            onClick={() => setTheme(theme === 'default-light' ? 'default-dark' : 'default-light')}
            aria-label={t('shell.toggleTheme')}
            title={t('shell.toggleTheme')}
          >
            {theme === 'default-light' ? <Moon size={14} /> : <Sun size={14} />}
            <span className="text-sm">
              {theme === 'default-light' ? t('shell.theme.dark') : t('shell.theme.light')}
            </span>
          </button>
          <button
            className="pixel-btn !px-2 !py-1"
            onClick={() => setSettingsOpen(true)}
            aria-label={t('settings.open')}
            title={t('settings.open')}
          >
            <SettingsIcon size={14} />
          </button>
        </div>
      </header>

      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />

      <div className="flex flex-1 min-h-0">
        {/* Sidebar */}
        {navOpen && (
          <nav className="w-56 shrink-0 border-r-2 border-[var(--fg)] p-3 flex flex-col gap-2">
            <div className="text-[var(--dim)] uppercase text-sm px-1 pb-1">{t('shell.modes')}</div>
            {MODES.map((m) => {
              const Icon = m.icon
              const active = mode === m.id
              return (
                <button
                  key={m.id}
                  data-active={active}
                  onClick={() => onMode(m.id)}
                  className={cn('pixel-btn w-full justify-start')}
                >
                  <Icon size={14} />
                  <span>{t(m.labelKey)}</span>
                </button>
              )
            })}

            <div className="mt-auto text-[var(--dim)] text-sm px-1 pt-3 divider">
              <div>{t('shell.footer.clientOnly')}</div>
              <div>{t('shell.footer.noUpload')}</div>
              <div className="mt-2 caret inline-block">{t('shell.footer.ready')}</div>
            </div>
          </nav>
        )}

        {/* Main */}
        <main className="flex-1 min-w-0 min-h-0 overflow-auto p-4 glow">{children}</main>
      </div>

      {/* CRT overlays */}
      <div className="crt-curve" />
    </div>
  )
}
