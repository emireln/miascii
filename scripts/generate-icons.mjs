// Generate every platform icon from the two hand-crafted pixel-cat PNGs
// dropped into /public:
//
//   public/miascii-icon.png      → cute pixel cat, transparent bg
//                                  → used for TRAY + FAVICON + PWA
//   public/miascii-logo.png      → pixel cat on styled background
//                                  → used for DESKTOP + TASKBAR + INSTALLER
//                                    (everywhere the user sees the "app" icon)
//
// Outputs (all derived, safe to nuke + regenerate):
//   build/icon.png            → Linux + electron-builder fallback  (logo-dark)
//   build/icon.ico            → Windows multi-res                  (logo-dark)
//   build/icon.icns           → macOS app bundle                   (logo-dark)
//   build/tray-icon.png       → tray @ 32px  (icon.png)
//   build/tray-icon@2x.png    → tray @ 64px  (icon.png)
//   electron/assets/*.png     → runtime copies shipped inside the app
//   public/favicon.ico        → browser tab multi-res  (icon.png)
//   public/icon-192.png       → PWA 192                 (icon.png)
//   public/icon-512.png       → PWA 512                 (icon.png)
//   public/apple-touch-icon.png → iOS home-screen       (icon.png)

import { readFile, writeFile, mkdir, rm } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import png2icons from 'png2icons'
import toIco from 'to-ico'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

//  --- SOURCES -----------------------------------------------------------------
// Chubby pixel cat → favicon + tray. Transparent background so it looks right
// on any OS taskbar color (dark on dark, dark on light, etc).
const TRAY_SRC = join(root, 'public', 'miascii-icon.png')
// Pixel cat logo → main app icon (desktop, taskbar,
// installer title-bar, Windows exe resource, macOS dock, Linux launcher).
const APP_SRC = join(root, 'public', 'miascii-logo.png')

const BUILD = join(root, 'build')
const PUBLIC = join(root, 'public')

async function ensureDir(p) {
  await mkdir(p, { recursive: true })
}

/**
 * Resize a source PNG (high-res master) down to a target icon size.
 * Uses `nearest` for small sizes (≤48 px) to preserve crisp pixel-art edges,
 * and `lanczos3` for larger sizes where smooth downscaling looks better.
 */
async function pngToPng(srcBuf, size) {
  const kernel = size <= 48 ? 'nearest' : 'lanczos3'
  return sharp(srcBuf)
    .resize(size, size, {
      fit: 'contain',
      kernel,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toBuffer()
}

async function main() {
  for (const p of [TRAY_SRC, APP_SRC]) {
    if (!existsSync(p)) {
      throw new Error(`Missing source icon: ${p}\nDrop the pixel-cat PNG there first.`)
    }
  }

  await ensureDir(BUILD)
  await ensureDir(PUBLIC)

  const traySrc = await readFile(TRAY_SRC)
  const appSrc = await readFile(APP_SRC)

  // ---------------------------------------------------------------------------
  // APP icon (cool shades cat) — resize to all desktop / installer sizes
  // ---------------------------------------------------------------------------
  console.log('→ rasterizing main app icon (logo-dark.png → every desktop size)...')
  const appSizes = [16, 24, 32, 48, 64, 128, 180, 192, 256, 512, 1024]
  const app = {}
  for (const s of appSizes) {
    app[s] = await pngToPng(appSrc, s)
    console.log(`   ${s}x${s}`)
  }

  // Linux + electron-builder fallback
  await writeFile(join(BUILD, 'icon.png'), app[512])
  await writeFile(join(BUILD, 'icon-1024.png'), app[1024])

  // Windows multi-res .ico — one buffer per size, to-ico packs them all in
  console.log('→ building Windows .ico (16/24/32/48/64/128/256)...')
  const ico = await toIco([app[16], app[24], app[32], app[48], app[64], app[128], app[256]])
  await writeFile(join(BUILD, 'icon.ico'), ico)

  // macOS .icns built from the 1024 master
  console.log('→ building macOS .icns...')
  const icns = png2icons.createICNS(app[1024], png2icons.BEZIER, 0)
  if (!icns) throw new Error('Failed to build .icns')
  await writeFile(join(BUILD, 'icon.icns'), icns)

  // Runtime copy shipped inside the app (window icon, etc)
  const electronAssets = join(root, 'electron', 'assets')
  await ensureDir(electronAssets)
  await writeFile(join(electronAssets, 'icon.png'), app[512])

  // ---------------------------------------------------------------------------
  // TRAY / FAVICON icon (baby cat) — resize to tray + browser sizes
  // ---------------------------------------------------------------------------
  console.log('→ rasterizing tray + favicon (icon.png → favicon & tray sizes)...')
  const traySizes = [16, 24, 32, 48, 64, 128, 180, 192, 256, 512]
  const tray = {}
  for (const s of traySizes) {
    tray[s] = await pngToPng(traySrc, s)
    console.log(`   ${s}x${s}`)
  }

  // Tray icons (system tray at 16/24/32 native, @2x for HiDPI)
  await writeFile(join(BUILD, 'tray-icon.png'), tray[32])
  await writeFile(join(BUILD, 'tray-icon@2x.png'), tray[64])
  await writeFile(join(electronAssets, 'tray-icon.png'), tray[32])
  await writeFile(join(electronAssets, 'tray-icon@2x.png'), tray[64])

  // Browser favicon — multi-res .ico covers every tab / bookmark / shortcut use
  console.log('→ building browser favicon.ico...')
  await writeFile(join(PUBLIC, 'favicon.ico'), await toIco([tray[16], tray[24], tray[32], tray[48], tray[64]]))

  // PWA + Apple Touch
  await writeFile(join(PUBLIC, 'icon-192.png'), tray[192])
  await writeFile(join(PUBLIC, 'icon-512.png'), tray[512])
  await writeFile(join(PUBLIC, 'apple-touch-icon.png'), tray[180])

  // ---------------------------------------------------------------------------
  // Drop stale SVG fallbacks from the previous pipeline — they no longer
  // match the pixel-cat identity and index.html no longer references them.
  // ---------------------------------------------------------------------------
  for (const stale of ['favicon.svg', 'logo.svg', 'logo-light.svg']) {
    const p = join(PUBLIC, stale)
    if (existsSync(p)) await rm(p)
  }

  console.log('\n✓ all icons generated')
  console.log('   app (cool-shades cat):   build/icon.{png,ico,icns}, electron/assets/icon.png')
  console.log('   tray + favicon (baby cat): build/tray-icon*.png, public/favicon.ico, icon-{192,512}.png')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
