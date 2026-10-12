import { useEffect, useRef, useState } from 'react'
import {
  Check, Coffee, Download, ExternalLink, FolderOpen, Power, RefreshCw, RotateCcw, Upload, X,
} from 'lucide-react'
import pkg from '../../package.json'
import { useT } from '../i18n'
import { clearPersisted, usePersisted } from '../lib/usePersisted'
import { bridge, isElectron, type ElectronSettings } from '../lib/electronBridge'
import { THEMES, normalizeTheme, type ThemeId } from '../lib/themes'
import { Label, Section, Slider, Toggle } from './Control'
import Notice from './Notice'

type Props = { open: boolean; onClose: () => void }

const DEFAULT_ELECTRON: ElectronSettings = {
  closeToTray: true,
  startMinimized: false,
  alwaysOnTop: false,
  launchAtStartup: false,
  minimizeToTray: false,
}

const REPO_URL = 'https://github.com/emireln/miascii'
const SUPPORT_URL = 'https://buymeacoffee.com/emireln'
const MAX_IMPORT_BYTES = 1_000_000

type UpdateState =
  | { kind: 'idle' }
  | { kind: 'checking' }
  | { kind: 'upToDate' }
  | { kind: 'available'; version: string }
  | { kind: 'downloading'; percent: number }
  | { kind: 'ready'; version: string }
  | { kind: 'disabled' }
  | { kind: 'error'; message: string }

type SettingsFile = { settings: Record<string, unknown>; electron?: Partial<ElectronSettings> }

/** Accepts only a miascii export: a JSON object whose settings hold miascii:* keys. */
function parseSettingsFile(text: string): SettingsFile | null {
  let data: unknown
  try { data = JSON.parse(text) } catch { return null }
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null
  const { settings, electron } = data as { settings?: unknown; electron?: unknown }
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) return null
  const entries = Object.entries(settings).filter(([k]) => k.startsWith('miascii:'))
  if (entries.length === 0) return null
  const electronPatch = electron && typeof electron === 'object' && !Array.isArray(electron)
    ? (electron as Partial<ElectronSettings>)
    : undefined
  return { settings: Object.fromEntries(entries), electron: electronPatch }
}

/**
 * Settings dialog: window & tray (desktop), appearance, data, about.
 * Focus moves in on open, Tab stays inside, Escape closes, and focus returns
 * to the opener.
 */
export default function SettingsPanel({ open, onClose }: Props) {
  const t = useT()
  const electron = isElectron()
  const [esettings, setEsettings] = useState<ElectronSettings>(DEFAULT_ELECTRON)
  const [reduceMotion, setReduceMotion] = usePersisted<boolean>('ui.reduceMotion', false)
  const [uiScale, setUiScale] = usePersisted<number>('ui.scale', 100)
  const [crt, setCrt] = usePersisted<number>('ui.crt', 15)
  const [themeRaw, setTheme] = usePersisted<ThemeId>('shell.theme', 'default-dark')
  const activeTheme = normalizeTheme(themeRaw)
  const [update, setUpdate] = useState<UpdateState>({ kind: 'idle' })
  const [importFailed, setImportFailed] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)
  const dialogRef = useRef<HTMLDivElement>(null)
  const importRef = useRef<HTMLInputElement>(null)

  // Electron settings: load once, then follow changes made from the tray menu.
  useEffect(() => {
    const b = bridge()
    if (!b) return
    let alive = true
    b.settings.get().then((s) => { if (alive) setEsettings(s) })
    const off = b.settings.onUpdate((s) => setEsettings(s))
    return () => { alive = false; off() }
  }, [])

  // Update events arrive only after a check. Stay subscribed for the component's
  // lifetime so a result that lands while the dialog is closed is not lost.
  useEffect(() => {
    const b = bridge()
    if (!b) return
    const offs = [
      b.updater.onAvailable((info) => setUpdate({ kind: 'available', version: info.version })),
      b.updater.onNotAvailable(() => setUpdate({ kind: 'upToDate' })),
      b.updater.onDownloaded((info) => setUpdate({ kind: 'ready', version: info.version })),
      b.updater.onProgress((p) => setUpdate({ kind: 'downloading', percent: p.percent })),
      b.updater.onError((e) => setUpdate({ kind: 'error', message: e.error })),
    ]
    return () => offs.forEach((off) => off())
  }, [])

  // Appearance applies whether or not the dialog is open.
  useEffect(() => {
    document.documentElement.style.fontSize = `${uiScale}%`
  }, [uiScale])

  useEffect(() => {
    document.documentElement.classList.toggle('reduce-motion', reduceMotion)
  }, [reduceMotion])

  // Focus management while open.
  useEffect(() => {
    if (!open) return
    const opener = document.activeElement as HTMLElement | null
    dialogRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
        return
      }
      if (e.key !== 'Tab' || !dialogRef.current) return
      const items = focusable(dialogRef.current)
      if (items.length === 0) return
      const first = items[0]
      const last = items[items.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      opener?.focus()
    }
  }, [open, onClose])

  // The reset button needs a second click; the armed state times out.
  useEffect(() => {
    if (!confirmReset) return
    const id = window.setTimeout(() => setConfirmReset(false), 4000)
    return () => window.clearTimeout(id)
  }, [confirmReset])

  if (!open) return null

  const setEsetting = async <K extends keyof ElectronSettings>(k: K, v: ElectronSettings[K]) => {
    const b = bridge()
    if (!b) return
    setEsettings(await b.settings.set({ [k]: v }))
  }

  const exportAll = () => {
    const dump: Record<string, unknown> = {}
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (!key || !key.startsWith('miascii:')) continue
      try { dump[key] = JSON.parse(localStorage.getItem(key) ?? 'null') } catch { /* skip unreadable entries */ }
    }
    const blob = new Blob([JSON.stringify({
      app: 'miascii',
      version: pkg.version,
      savedAt: new Date().toISOString(),
      settings: dump,
      electron: esettings,
    }, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `miascii-settings-${Date.now()}.json`
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 10_000)
  }

  const importFile = async (file: File) => {
    const parsed = file.size <= MAX_IMPORT_BYTES ? parseSettingsFile(await file.text()) : null
    if (!parsed) {
      setImportFailed(true)
      return
    }
    try {
      for (const [k, v] of Object.entries(parsed.settings)) {
        localStorage.setItem(k, JSON.stringify(v))
      }
    } catch {
      setImportFailed(true)
      return
    }
    if (electron && parsed.electron) await bridge()?.settings.set(parsed.electron)
    window.location.reload()
  }

  const resetAll = () => {
    if (!confirmReset) {
      setConfirmReset(true)
      return
    }
    clearPersisted()
    if (electron) bridge()?.settings.set(DEFAULT_ELECTRON).catch(() => {})
    window.location.reload()
  }

  const checkForUpdates = async () => {
    const b = bridge()
    if (!b) return
    setUpdate({ kind: 'checking' })
    const result = await b.updater.check()
    if (result.disabled) setUpdate({ kind: 'disabled' })
    else if (result.error) setUpdate({ kind: 'error', message: result.error })
  }

  const downloadUpdate = async () => {
    const b = bridge()
    if (!b) return
    setUpdate({ kind: 'downloading', percent: 0 })
    const result = await b.updater.download()
    if (result.error) setUpdate({ kind: 'error', message: result.error })
  }

  const updateText = (() => {
    switch (update.kind) {
      case 'idle': return t('settings.update.idle')
      case 'checking': return t('settings.update.checking')
      case 'upToDate': return t('settings.update.upToDate')
      case 'available': return t('settings.update.available', { version: update.version })
      case 'downloading': return t('settings.update.downloading', { percent: update.percent })
      case 'ready': return t('settings.update.ready', { version: update.version })
      case 'disabled': return t('settings.update.disabled')
      case 'error': return t('settings.update.error', { message: update.message })
    }
  })()
  const busy = update.kind === 'checking' || update.kind === 'downloading'

  return (
    <div className="modal-scrim" onMouseDown={onClose}>
      <div
        ref={dialogRef}
        className="modal pixel-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        tabIndex={-1}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="modal-head">
          <h2 id="settings-title" className="pixel-label">{t('settings.title')}</h2>
          <button type="button" className="pixel-btn pixel-btn--sm" onClick={onClose} aria-label={t('common.close')}>
            <X size={14} aria-hidden="true" />
          </button>
        </header>

        <div className="modal-body">
          <Section title={t('settings.section.window')}>
            {!electron && <p className="field-hint">{t('settings.desktop.only')}</p>}
            <Toggle
              value={esettings.closeToTray}
              onChange={(v) => setEsetting('closeToTray', v)}
              label={t('settings.closeToTray')}
              disabled={!electron}
            />
            <p className="field-hint">{t('settings.closeToTray.hint')}</p>
            <Toggle
              value={esettings.minimizeToTray}
              onChange={(v) => setEsetting('minimizeToTray', v)}
              label={t('settings.minimizeToTray')}
              disabled={!electron}
            />
            <Toggle
              value={esettings.startMinimized}
              onChange={(v) => setEsetting('startMinimized', v)}
              label={t('settings.startMinimized')}
              disabled={!electron}
            />
            <Toggle
              value={esettings.alwaysOnTop}
              onChange={(v) => setEsetting('alwaysOnTop', v)}
              label={t('settings.alwaysOnTop')}
              disabled={!electron}
            />
            <Toggle
              value={esettings.launchAtStartup}
              onChange={(v) => setEsetting('launchAtStartup', v)}
              label={t('settings.launchAtStartup')}
              disabled={!electron}
            />
          </Section>

          <Section title={t('settings.section.appearance')}>
            <div>
              <Label>{t('settings.theme')}</Label>
              <div className="theme-grid">
                {THEMES.map((th) => {
                  const active = th.id === activeTheme
                  return (
                    <button
                      key={th.id}
                      type="button"
                      className="theme-option"
                      aria-pressed={active}
                      data-active={active}
                      onClick={() => setTheme(th.id)}
                    >
                      <span className="theme-swatch" aria-hidden="true" style={{ background: th.bg, borderColor: th.fg }}>
                        <span style={{ background: th.fg }} />
                      </span>
                      <span className="theme-name">{t(th.nameKey)}</span>
                      {active && <Check size={12} aria-hidden="true" />}
                    </button>
                  )
                })}
              </div>
            </div>
            <div>
              <Label>{`${t('settings.crtIntensity')} (${crt}%)`}</Label>
              <Slider value={crt} onChange={setCrt} min={0} max={100} step={5} label={t('settings.crtIntensity')} />
            </div>
            <div>
              <Label>{`${t('settings.uiScale')} (${uiScale}%)`}</Label>
              <Slider value={uiScale} onChange={setUiScale} min={80} max={140} step={5} label={t('settings.uiScale')} />
            </div>
            <Toggle value={reduceMotion} onChange={setReduceMotion} label={t('settings.reduceMotion')} />
          </Section>

          <Section title={t('settings.section.data')}>
            <div className="btn-row">
              <button type="button" className="pixel-btn" onClick={exportAll}>
                <Download size={14} aria-hidden="true" />
                {t('settings.export')}
              </button>
              <button type="button" className="pixel-btn" onClick={() => importRef.current?.click()}>
                <Upload size={14} aria-hidden="true" />
                {t('settings.import')}
              </button>
              {electron && (
                <button type="button" className="pixel-btn" onClick={() => bridge()?.settings.revealFile()}>
                  <FolderOpen size={14} aria-hidden="true" />
                  {t('settings.revealFile')}
                </button>
              )}
              <button type="button" className="pixel-btn is-danger" onClick={resetAll}>
                <RotateCcw size={14} aria-hidden="true" />
                {confirmReset ? t('settings.resetAll.sure') : t('settings.resetAll')}
              </button>
              {electron && (
                <button type="button" className="pixel-btn is-danger" onClick={() => bridge()?.app.quit()}>
                  <Power size={14} aria-hidden="true" />
                  {t('settings.quit')}
                </button>
              )}
            </div>
            <input
              ref={importRef}
              type="file"
              accept="application/json,.json"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0]
                e.target.value = ''
                if (f) importFile(f)
              }}
            />
            {importFailed && <Notice>{t('settings.import.invalid')}</Notice>}
          </Section>

          <Section title={t('settings.section.about')}>
            <div className="about">
              <div className="about-name">miascii <span>v{pkg.version}</span></div>
              <p className="field-hint">{t('settings.about.tagline')}</p>
            </div>
            <div className="btn-row">
              <a className="pixel-btn" href={REPO_URL} target="_blank" rel="noopener noreferrer">
                <ExternalLink size={14} aria-hidden="true" />
                {t('settings.about.repo')}
              </a>
              <a className="pixel-btn" href={SUPPORT_URL} target="_blank" rel="noopener noreferrer">
                <Coffee size={14} aria-hidden="true" />
                {t('shell.support')}
              </a>
            </div>
            {electron && (
              <div className="update-box">
                <div className="update-status" role="status" aria-live="polite">{updateText}</div>
                <div className="btn-row">
                  {update.kind !== 'ready' && (
                    <button type="button" className="pixel-btn" onClick={checkForUpdates} disabled={busy}>
                      <RefreshCw size={14} aria-hidden="true" />
                      {t('settings.check')}
                    </button>
                  )}
                  {update.kind === 'available' && (
                    <button type="button" className="pixel-btn" onClick={downloadUpdate}>
                      <Download size={14} aria-hidden="true" />
                      {t('settings.updateDownload')}
                    </button>
                  )}
                  {update.kind === 'ready' && (
                    <button type="button" className="pixel-btn" onClick={() => bridge()?.updater.install()}>
                      <RefreshCw size={14} aria-hidden="true" />
                      {t('settings.updateInstall')}
                    </button>
                  )}
                </div>
              </div>
            )}
          </Section>
        </div>
      </div>
    </div>
  )
}

function focusable(root: HTMLElement): HTMLElement[] {
  return Array.from(
    root.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((el) => el.offsetParent !== null)
}
