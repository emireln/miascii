// Theme catalog. Each theme is a [data-theme] block of CSS tokens in
// global.css; the swatch colors here only drive the picker preview.
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
  nameKey: string
  bg: string
  fg: string
  mode: 'dark' | 'light'
}

export const THEMES: ThemeDef[] = [
  { id: 'default-dark', nameKey: 'theme.defaultDark', bg: '#0a0a0a', fg: '#e6e6e6', mode: 'dark' },
  { id: 'default-light', nameKey: 'theme.defaultLight', bg: '#e9e9e4', fg: '#0a0a0a', mode: 'light' },
  { id: 'phosphor', nameKey: 'theme.phosphor', bg: '#000000', fg: '#33ff66', mode: 'dark' },
  { id: 'amber', nameKey: 'theme.amber', bg: '#0b0600', fg: '#ffb000', mode: 'dark' },
  { id: 'synthwave', nameKey: 'theme.synthwave', bg: '#140425', fg: '#ff2d95', mode: 'dark' },
  { id: 'cyan', nameKey: 'theme.cyan', bg: '#000814', fg: '#00e6ff', mode: 'dark' },
  { id: 'alert', nameKey: 'theme.alert', bg: '#0a0000', fg: '#ff3b3b', mode: 'dark' },
  { id: 'paper', nameKey: 'theme.paper', bg: '#f4f0e8', fg: '#2a1a05', mode: 'light' },
]

export function isThemeId(v: unknown): v is ThemeId {
  return THEMES.some((t) => t.id === v)
}

/** Maps stored values, including the legacy 'dark' and 'light', onto the catalog. */
export function normalizeTheme(v: unknown): ThemeId {
  if (v === 'dark') return 'default-dark'
  if (v === 'light') return 'default-light'
  return isThemeId(v) ? v : 'default-dark'
}
