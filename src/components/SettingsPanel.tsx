import { useEffect, useRef, useState } from 'react'
import { X, ExternalLink, Download, Upload, FolderOpen, Power, RotateCcw, Check } from 'lucide-react'
import { useT } from '../i18n'
import { usePersisted, clearPersisted } from '../lib/usePersisted'
import { bridge, isElectron, type ElectronSettings } from '../lib/electronBridge'
import { THEMES, normalizeTheme, type ThemeId } from '../lib/themes'
import { Label, Slider, Toggle } from './Control'

type Props = { open: boolean; onClose: () => void }

const DEFAULT_ELECTRON: ElectronSettings = {
  closeToTray: true,
  startMinimized: false,
  alwaysOnTop: false,
  launchAtStartup: false,
  minimizeToTray: false,
}

/**
 * SettingsPanel — modal dialog with 4 sections:
 *   window & tray  (electron-only; disabled on web)
 *   appearance     (CRT intensity, reduce motion, UI scale — CSS vars on <html>)
 *   data           (export / import / reset / quit)
 *   about          (version, tagline, external link)
 */
export default function SettingsPanel({ open, onClose }: Props) {
  const t = useT()
  const [esettings, setEsettings] = useState<ElectronSettings>(DEFAULT_ELECTRON)
  const [version, setVersion] = useState<string>('0.1.0')

  // Renderer-only appearance prefs
  const [crtIntensity, setCrtIntensity] = usePersisted<number>('ui.crtIntensity', 0)
  const [reduceMotion, setReduceMotion] = usePersisted<boolean>('ui.reduceMotion', false)
  const [uiScale, setUiScale] = usePersisted<number>('ui.scale', 100)
  const [themeRaw, setTheme] = usePersisted<ThemeId>('shell.theme', 'default-dark')
  const activeTheme = normalizeTheme(themeRaw)

  const importRef = useRef<HTMLInputElement>(null)

  // Pull electron settings + listen for updates
  useEffect(() => {
    if (!isElectron()) return
    const b = bridge()
    if (!b) return
    let alive = true
    b.settings.get().then((s) => { if (alive) setEsettings(s) })
    b.app.version().then((v) => { if (alive) setVersion(v) })
    const off = b.settings.onUpdate((s) => setEsettings(s))
    return () => { alive = false; off() }
  }, [])

  // Apply appearance CSS vars globally whenever they change
  useEffect(() => {
    const root = document.documentElement
    root.style.setProperty('--crt-intensity', String(crtIntensity))
    root.style.fontSize = `${uiScale}%`
    if (reduceMotion) root.classList.add('reduce-motion')
    else root.classList.remove('reduce-motion')
  }, [crtIntensity, reduceMotion, uiScale])

  // ESC closes
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const setEsetting = async <K extends keyof ElectronSettings>(k: K, v: ElectronSettings[K]) => {
    const b = bridge()
    if (!b) { setEsettings((s) => ({ ...s, [k]: v })); return }
    const next = await b.settings.set({ [k]: v })
    setEsettings(next)
  }

  const exportAll = () => {
    const dump: Record<string, unknown> = {}
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (!key || !key.startsWith('miascii:')) continue
      try { dump[key] = JSON.parse(localStorage.getItem(key) || 'null') }
      catch { dump[key] = localStorage.getItem(key) }
    }
    const blob = new Blob([JSON.stringify({
      version, savedAt: new Date().toISOString(), settings: dump, electron: esettings,
    }, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `miascii-settings-${Date.now()}.json`
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 1000)
  }

  const importFile = async (file: File) => {
    try {
      const text = await file.text()
      const parsed = JSON.parse(text)
      if (parsed.settings && typeof parsed.settings === 'object') {
        for (const [k, v] of Object.entries(parsed.settings)) {
          if (k.startsWith('miascii:')) {
            localStorage.setItem(k, JSON.stringify(v))
          }
        }
      }
      if (parsed.electron && isElectron()) {
        await bridge()?.settings.set(parsed.electron)
      }
      window.location.reload()
    } catch (e) {
      alert(`import failed: ${(e as Error).message}`)
    }
  }

  const resetAll = () => {
    if (!confirm(t('settings.resetAll.confirm'))) return
    clearPersisted()
    if (isElectron()) bridge()?.settings.set(DEFAULT_ELECTRON).catch(() => {})
    window.location.reload()
  }

  const electron = isElectron()
  const disabledCls = electron ? '' : 'opacity-50 pointer-events-none'

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center p-4 sm:p-8 overflow-auto"
      style={{ background: 'rgba(0,0,0,0.7)' }}
      onClick={onClose}
    >
      <div
        className="pixel-panel w-full max-w-[720px] p-5 my-8 space-y-5"
        style={{ background: 'var(--panel)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div className="font-pixel text-[11px] uppercase tracking-widest">
            {t('settings.title')}
          </div>
          <button className="pixel-btn !px-2 !py-1" onClick={onClose} aria-label={t('common.close')}>
            <X size={14} />
          </button>
        </div>

        {/* Window & Tray */}
        <section className="space-y-3">
          <div className="flex items-baseline gap-2">
            <Label>{`> ${t('settings.section.window')}`}</Label>
            {!electron && (
              <span className="text-[var(--dim)] text-sm">{t('settings.desktop.only')}</span>
            )}
          </div>
          <div className={`space-y-2 ${disabledCls}`}>
            <Toggle
              value={esettings.closeToTray}
              onChange={(v) => setEsetting('closeToTray', v)}
              label={t('settings.closeToTray')}
            />
            <div className="text-[var(--dim)] text-sm pl-8 -mt-1">
              {t('settings.closeToTray.hint')}
            </div>
            <Toggle
              value={esettings.minimizeToTray}
              onChange={(v) => setEsetting('minimizeToTray', v)}
              label={t('settings.minimizeToTray')}
            />
            <Toggle
              value={esettings.startMinimized}
              onChange={(v) => setEsetting('startMinimized', v)}
              label={t('settings.startMinimized')}
            />
            <Toggle
              value={esettings.alwaysOnTop}
              onChange={(v) => setEsetting('alwaysOnTop', v)}
              label={t('settings.alwaysOnTop')}
            />
            <Toggle
              value={esettings.launchAtStartup}
              onChange={(v) => setEsetting('launchAtStartup', v)}
              label={t('settings.launchAtStartup')}
            />
          </div>
        </section>

        <div className="divider" />

        {/* Appearance */}
        <section className="space-y-3">
          <Label>{`> ${t('settings.section.appearance')}`}</Label>

          <div>
            <Label>{t('settings.theme')}</Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {THEMES.map((th) => {
                const active = th.id === activeTheme
                return (
                  <button
                    key={th.id}
                    type="button"
                    onClick={() => setTheme(th.id)}
                    className="pixel-btn !px-2 !py-1.5 !text-xs justify-between"
                    data-active={active}
                    title={t(th.nameKey)}
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <span
                        aria-hidden
                        style={{
                          display: 'inline-block',
                          width: 18,
                          height: 18,
                          flexShrink: 0,
                          // diagonal split: bg in upper-left, fg in lower-right
                          background: `linear-gradient(135deg, ${th.bg} 0 50%, ${th.fg} 50% 100%)`,
                          outline: '1px solid currentColor',
                          outlineOffset: 0,
                        }}
                      />
                      <span className="truncate">{t(th.nameKey)}</span>
                    </span>
                    {active && <Check size={12} />}
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <Label>{`${t('settings.crtIntensity')} (${crtIntensity}%)`}</Label>
            <Slider value={crtIntensity} onChange={setCrtIntensity} min={0} max={100} step={5} />
          </div>
          <div>
            <Label>{`${t('settings.uiScale')} (${uiScale}%)`}</Label>
            <Slider value={uiScale} onChange={setUiScale} min={80} max={140} step={5} />
          </div>
          <Toggle
            value={reduceMotion}
            onChange={setReduceMotion}
            label={t('settings.reduceMotion')}
          />
        </section>

        <div className="divider" />

        {/* Data */}
        <section className="space-y-2">
          <Label>{`> ${t('settings.section.data')}`}</Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button className="pixel-btn justify-start" onClick={exportAll}>
              <Download size={14} />
              {t('settings.export')}
            </button>
            <button
              className="pixel-btn justify-start"
              onClick={() => importRef.current?.click()}
            >
              <Upload size={14} />
              {t('settings.import')}
            </button>
            {electron && (
              <button
                className="pixel-btn justify-start"
                onClick={() => bridge()?.settings.revealFile()}
              >
                <FolderOpen size={14} />
                {t('settings.revealFile')}
              </button>
            )}
            <button
              className="pixel-btn justify-start"
              onClick={resetAll}
              style={{ color: '#ff6b6b' }}
            >
              <RotateCcw size={14} />
              {t('settings.resetAll')}
            </button>
          </div>
          <input
            ref={importRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) importFile(f) }}
          />
        </section>

        <div className="divider" />

        {/* About */}
        <section className="space-y-2">
          <Label>{`> ${t('settings.section.about')}`}</Label>
          <div className="text-[var(--dim)] text-sm space-y-1">
            <div>
              <span className="text-[var(--fg)] font-pixel uppercase text-[11px] tracking-widest">miascii</span>
              <span className="ml-2">{t('settings.about.version')} {version}</span>
            </div>
            <div>{t('settings.about.tagline')}</div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              className="pixel-btn justify-start"
              onClick={() => {
                const url = 'https://github.com/'
                if (electron) bridge()?.app.openExternal(url)
                else window.open(url, '_blank', 'noopener')
              }}
            >
              <ExternalLink size={14} />
              {t('settings.about.repo')}
            </button>
            {electron && (
              <button
                className="pixel-btn justify-start"
                onClick={() => bridge()?.app.quit()}
                style={{ color: '#ff6b6b' }}
              >
                <Power size={14} />
                {t('settings.quit')}
              </button>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
