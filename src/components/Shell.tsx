import { useEffect, useState } from 'react'
import {
  Type, Image as ImageIcon, Video, Coffee, PanelLeftClose, PanelLeftOpen, Menu,
  Settings as SettingsIcon, Sun, Moon, ShieldCheck, type LucideIcon,
} from 'lucide-react'
import { cn } from '../lib/cn'
import { usePersisted } from '../lib/usePersisted'
import { normalizeTheme, THEMES, type ThemeId } from '../lib/themes'
import { useT } from '../i18n'
import LanguageSwitcher from './LanguageSwitcher'
import SettingsPanel from './SettingsPanel'
import { UpdateBanner } from './UpdateBanner'

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
  const [themeRaw, setThemeRaw] = usePersisted<ThemeId>('shell.theme', 'default-light')
  const theme = normalizeTheme(themeRaw)
  const [navOpen, setNavOpen] = usePersisted<boolean>('shell.navOpen', true)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(() => window.matchMedia('(max-width: 700px)').matches)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const currentMode = MODES.find((item) => item.id === mode) ?? MODES[0]

  useEffect(() => {
    const media = window.matchMedia('(max-width: 700px)')
    const sync = () => {
      setIsMobile(media.matches)
      if (!media.matches) setMobileNavOpen(false)
    }
    sync()
    media.addEventListener('change', sync)
    return () => media.removeEventListener('change', sync)
  }, [])

  useEffect(() => {
    const root = document.documentElement
    root.dataset.theme = theme
    const definition = THEMES.find((item) => item.id === theme)
    if (definition?.mode === 'light') root.classList.add('light')
    else root.classList.remove('light')
  }, [theme])

  const chooseMode = (nextMode: Mode) => {
    onMode(nextMode)
    setMobileNavOpen(false)
  }

  return (
    <div className="app-shell">
      <UpdateBanner />
      <div className="app-frame">
        {mobileNavOpen && (
          <button
            className="sidebar-scrim"
            type="button"
            aria-label={t('common.close')}
            onClick={() => setMobileNavOpen(false)}
          />
        )}

        <aside className={cn('app-sidebar', !navOpen && 'is-collapsed', mobileNavOpen && 'mobile-open')}>
          <div className="sidebar-brand">
            <div className="brand-mark" aria-hidden="true">m</div>
            <div className="brand-copy">
              <strong>miascii</strong>
            </div>
          </div>

          <div className="sidebar-section-label">{t('shell.modes')}</div>
          <nav className="mode-nav" aria-label={t('shell.modes')}>
            {MODES.map(({ id, labelKey, icon: Icon }) => (
              <button
                key={id}
                className={cn('nav-item', mode === id && 'active')}
                type="button"
                title={t(labelKey)}
                aria-current={mode === id ? 'page' : undefined}
                onClick={() => chooseMode(id)}
              >
                <Icon size={19} aria-hidden="true" />
                <span className="nav-label">{t(labelKey)}</span>
              </button>
            ))}
          </nav>

          <div className="sidebar-bottom">
            <div className="privacy-note">
              <ShieldCheck size={17} aria-hidden="true" />
              <span>{t('shell.footer.noUpload')}</span>
            </div>
            <a
              className="support-link"
              href="https://buymeacoffee.com/emireln"
              target="_blank"
              rel="noopener noreferrer"
              title={t('shell.support')}
            >
              <Coffee size={18} aria-hidden="true" />
              <span className="support-label">{t('shell.support')}</span>
            </a>
          </div>
        </aside>

        <div className="app-main">
          <header className="app-topbar">
            <div className="topbar-leading">
              <button
                className="icon-button topbar-mobile-menu"
                type="button"
                aria-label={isMobile
                  ? t(mobileNavOpen ? 'shell.hideSidebar' : 'shell.showSidebar')
                  : t(navOpen ? 'shell.hideSidebar' : 'shell.showSidebar')}
                onClick={() => {
                  if (isMobile) setMobileNavOpen((open) => !open)
                  else setNavOpen((open) => !open)
                }}
              >
                <span className="desktop-only">
                  {navOpen ? <PanelLeftClose size={19} /> : <PanelLeftOpen size={19} />}
                </span>
                <Menu className="mobile-only" size={20} />
              </button>
              <span>{t(currentMode.labelKey)}</span>
            </div>
            <div className="topbar-actions">
              <button
                className="icon-button"
                type="button"
                onClick={() => setThemeRaw(theme === 'default-light' ? 'default-dark' : 'default-light')}
                aria-label={t('shell.toggleTheme')}
                title={t('shell.toggleTheme')}
              >
                {theme === 'default-light' ? <Moon size={18} /> : <Sun size={18} />}
              </button>
              <LanguageSwitcher />
              <button
                className="icon-button"
                type="button"
                onClick={() => setSettingsOpen(true)}
                aria-label={t('settings.open')}
                title={t('settings.open')}
              >
                <SettingsIcon size={18} />
              </button>
            </div>
          </header>

          <main className="app-content">
            <div className="content-wrap">
              <div className="page-heading">
                <div>
                  <p>{t('shell.modes')}</p>
                  <h1>{t(currentMode.labelKey)}</h1>
                </div>
              </div>
              {children}
            </div>
          </main>
        </div>
      </div>

      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  )
}
