// Theme catalog — each theme is applied by setting <html data-theme="id">.
// All CSS tokens are switched via [data-theme] selectors in global.css.
//
// The two swatches (bg/fg) are used by SettingsPanel to render a visual chip.

export type ThemeId =
  | 'default-dark'
  | 'default-light'
  | 'phosphor'
  | 'amber'
  | 'synthwave'
  | 'cyan'
  | 'alert'
  | 'paper'

export type ThemeDef = {
  id: ThemeId
  nameKey: string   // i18n key in dict
  bg: string        // for preview swatch
  fg: string        // for preview swatch
  mode: 'dark' | 'light'
}

export const THEMES: ThemeDef[] = [
  { id: 'default-dark',  nameKey: 'theme.defaultDark',  bg: '#0a0a0a', fg: '#e6e6e6', mode: 'dark'  },
  { id: 'default-light', nameKey: 'theme.defaultLight', bg: '#ffffff', fg: '#000000', mode: 'light' },
  { id: 'phosphor',      nameKey: 'theme.phosphor',     bg: '#000000', fg: '#33ff66', mode: 'dark'  },
  { id: 'amber',         nameKey: 'theme.amber',        bg: '#0b0600', fg: '#ffb000', mode: 'dark'  },
  { id: 'synthwave',     nameKey: 'theme.synthwave',    bg: '#140425', fg: '#ff2d95', mode: 'dark'  },
  { id: 'cyan',          nameKey: 'theme.cyan',         bg: '#000814', fg: '#00e6ff', mode: 'dark'  },
  { id: 'alert',         nameKey: 'theme.alert',        bg: '#0a0000', fg: '#ff3b3b', mode: 'dark'  },
  { id: 'paper',         nameKey: 'theme.paper',        bg: '#f3ead9', fg: '#2a1a05', mode: 'light' },
]

export function isThemeId(v: unknown): v is ThemeId {
  return typeof v === 'string' && THEMES.some((t) => t.id === v)
}

/** Migrate legacy 'dark' / 'light' persisted values to the new catalog. */
export function normalizeTheme(v: unknown): ThemeId {
  if (v === 'dark') return 'default-dark'
  if (v === 'light') return 'default-light'
  if (isThemeId(v)) return v
  return 'default-dark'
}
