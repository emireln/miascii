// Typed helper for the electron bridge exposed via preload.cjs.
// Safe to import in the browser build — falls back to no-ops when
// window.miascii isn't present (i.e. running on the web).

export type ElectronSettings = {
  closeToTray: boolean
  startMinimized: boolean
  alwaysOnTop: boolean
  launchAtStartup: boolean
  minimizeToTray: boolean
}

type MiasciiBridge = {
  isDesktop: true
  platform: NodeJS.Platform
  settings: {
    get: () => Promise<ElectronSettings>
    set: (patch: Partial<ElectronSettings>) => Promise<ElectronSettings>
    onUpdate: (handler: (s: ElectronSettings) => void) => () => void
    revealFile: () => Promise<void>
  }
  app: {
    quit: () => Promise<void>
    hide: () => Promise<void>
    show: () => Promise<void>
    version: () => Promise<string>
    openExternal: (url: string) => Promise<void>
  }
}

declare global {
  interface Window { miascii?: MiasciiBridge }
}

export const isElectron = (): boolean => !!window.miascii?.isDesktop

export const bridge = (): MiasciiBridge | null => window.miascii ?? null
