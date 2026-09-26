// Theme catalog — preferences are persisted by ID so the UI can evolve safely.
export type ThemeId = 'default-dark' | 'default-light'

export type ThemeDef = {
  id: ThemeId
  nameKey: string
  bg: string
  fg: string
  mode: 'dark' | 'light'
}

export const THEMES: ThemeDef[] = [
  { id: 'default-light', nameKey: 'theme.defaultLight', bg: '#f5f6f8', fg: '#191b21', mode: 'light' },
  { id: 'default-dark', nameKey: 'theme.defaultDark', bg: '#111216', fg: '#f2f3f6', mode: 'dark' },
]

export function isThemeId(v: unknown): v is ThemeId {
  return v === 'default-dark' || v === 'default-light'
}

/** Migrate older palettes to the clean light/dark palette without losing preference. */
export function normalizeTheme(v: unknown): ThemeId {
  if (v === 'dark' || v === 'default-dark') return 'default-dark'
  if (v === 'light' || v === 'default-light' || v === 'paper') return 'default-light'
  if (typeof v === 'string' && ['phosphor', 'amber', 'synthwave', 'cyan', 'alert'].includes(v)) {
    return 'default-dark'
  }
  return 'default-light'
}
