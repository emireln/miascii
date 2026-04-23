import figlet from 'figlet'

// Vite globs all figlet font modules at build time into lazy per-font chunks.
const fontModules = import.meta.glob(
  '../../node_modules/figlet/importable-fonts/*.js',
) as Record<string, () => Promise<{ default: string }>>

// Derive the full font catalog from what's actually installed.
// Every file in figlet/importable-fonts/*.js is a figlet font; file name (without .js) is the font name.
const DERIVED_FONTS: string[] = Object.keys(fontModules)
  .map((p) => {
    const m = p.match(/\/([^/]+)\.js$/)
    return m ? m[1] : null
  })
  .filter((n): n is string => !!n)
  .sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' }))

// Handful of "classic" fonts promoted to the top of the list for quick access.
const FAVORITES = [
  'Standard', 'Slant', 'Small', 'Shadow', 'Big', 'Block', 'Doom', 'Ghost',
  'ANSI Shadow', 'Graffiti', '3D-ASCII', 'Star Wars', 'Colossal',
]

export const FIGLET_FONTS: string[] = [
  ...FAVORITES.filter((f) => DERIVED_FONTS.includes(f)),
  ...DERIVED_FONTS.filter((f) => !FAVORITES.includes(f)),
]

export type FigletFontName = string

const loaded = new Set<string>()

function findLoader(name: string) {
  const key = Object.keys(fontModules).find((k) => k.endsWith(`/${name}.js`))
  return key ? fontModules[key] : null
}

export async function ensureFont(name: string): Promise<void> {
  if (loaded.has(name)) return
  const loader = findLoader(name)
  if (!loader) throw new Error(`Font not found: ${name}`)
  const mod = await loader()
  figlet.parseFont(name, mod.default)
  loaded.add(name)
}

export type KerningMethod =
  | 'default'
  | 'full'
  | 'fitted'
  | 'controlled smushing'
  | 'universal smushing'

export const KERNING_METHODS: KerningMethod[] = [
  'default',
  'full',
  'fitted',
  'controlled smushing',
  'universal smushing',
]

export type RenderOptions = {
  horizontalLayout?: KerningMethod
  verticalLayout?: KerningMethod
  width?: number
  whitespaceBreak?: boolean
}

export async function renderFiglet(
  text: string,
  font: string,
  options: RenderOptions = {},
): Promise<string> {
  await ensureFont(font)
  return figlet.textSync(text, {
    font: font as FigletFontName,
    horizontalLayout: options.horizontalLayout ?? 'default',
    verticalLayout: options.verticalLayout ?? 'default',
    width: options.width ?? 120,
    whitespaceBreak: options.whitespaceBreak ?? true,
  })
}
