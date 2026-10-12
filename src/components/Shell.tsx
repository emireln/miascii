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

export type Mode = 'text' | 'image' | 'video'

type Props = {
  mode: Mode
  onMode: (m: Mode) => void
  children: React.ReactNode
}

const MODES: { id: Mode; labelKey: string; descKey: string; icon: LucideIcon }[] = [
  { id: 'text', labelKey: 'shell.mode.text', descKey: 'shell.desc.text', icon: Type },
  { id: 'image', labelKey: 'shell.mode.image', descKey: 'shell.desc.image', icon: ImageIcon },
  { id: 'video', labelKey: 'shell.mode.video', descKey: 'shell.desc.video', icon: Video },
]

const MOBILE_QUERY = '(max-width: 700px)'

export default function Shell({ mode, onMode, children }: Props) {
  const t = useT()
  const [themeRaw, setThemeRaw] = usePersisted<ThemeId>('shell.theme', 'default-dark')
  const theme = normalizeTheme(themeRaw)
  const isLight = THEMES.find((item) => item.id === theme)?.mode === 'light'
  const [navOpen, setNavOpen] = usePersisted<boolean>('shell.navOpen', true)
  const [crt] = usePersisted<number>('ui.crt', 15)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(() => window.matchMedia(MOBILE_QUERY).matches)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const currentMode = MODES.find((item) => item.id === mode) ?? MODES[0]

  useEffect(() => {
    const media = window.matchMedia(MOBILE_QUERY)
    const sync = () => {
      setIsMobile(media.matches)
      if (!media.matches) setMobileNavOpen(false)
    }
    sync()
    media.addEventListener('change', sync)
    return () => media.removeEventListener('change', sync)
  }, [])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  useEffect(() => {
    document.documentElement.style.setProperty('--crt', String(crt / 100))
  }, [crt])

  useEffect(() => {
    document.title = `miascii — ${t(currentMode.labelKey)}`
  }, [currentMode.labelKey, t])

  const chooseMode = (nextMode: Mode) => {
    onMode(nextMode)
    setMobileNavOpen(false)
  }

  return (
    <div className="app-shell">
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

          <div className="sidebar-section-label pixel-label">{t('shell.modes')}</div>
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
                className="icon-button"
                type="button"
                aria-label={isMobile
                  ? t(mobileNavOpen ? 'shell.hideSidebar' : 'shell.showSidebar')
                  : t(navOpen ? 'shell.hideSidebar' : 'shell.showSidebar')}
                aria-expanded={isMobile ? mobileNavOpen : navOpen}
                onClick={() => {
                  if (isMobile) setMobileNavOpen((open) => !open)
                  else setNavOpen((open) => !open)
                }}
              >
                {isMobile ? <Menu size={20} aria-hidden="true" /> : navOpen
                  ? <PanelLeftClose size={19} aria-hidden="true" />
                  : <PanelLeftOpen size={19} aria-hidden="true" />}
              </button>
              {isMobile && <span className="topbar-title pixel-label">miascii</span>}
            </div>
            <div className="topbar-actions">
              <button
                className="icon-button"
                type="button"
                onClick={() => setThemeRaw(isLight ? 'default-dark' : 'default-light')}
                aria-label={t('shell.toggleTheme')}
                title={t('shell.toggleTheme')}
              >
                {isLight ? <Moon size={18} aria-hidden="true" /> : <Sun size={18} aria-hidden="true" />}
              </button>
              <LanguageSwitcher />
              <button
                className="icon-button"
                type="button"
                onClick={() => setSettingsOpen(true)}
                aria-label={t('settings.open')}
                title={t('settings.open')}
              >
                <SettingsIcon size={18} aria-hidden="true" />
              </button>
            </div>
          </header>

          <main className="app-content">
            <div className="content-wrap">
              <header className="page-heading">
                <h1>{t(currentMode.labelKey)}</h1>
                <p>{t(currentMode.descKey)}</p>
              </header>
              {children}
            </div>
          </main>
        </div>
      </div>

      {crt > 0 && <div className="crt-overlay" aria-hidden="true" />}
      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  )
}
