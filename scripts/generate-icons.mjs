// Generate every platform icon from assets/logo-mascot.svg:
//  • build/icon.png            (512x512)  → electron-builder: Linux, fallback
//  • build/icon.ico            (multi-res) → electron-builder: Windows
//  • build/icon.icns           (multi-res) → electron-builder: macOS
//  • public/favicon.ico        (16/32/48)  → browser tab
//  • public/favicon.svg        (vector)    → modern browsers
//  • public/apple-touch-icon.png (180x180)
//  • public/icon-192.png / icon-512.png    → PWA-style
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import png2icons from 'png2icons'
import toIco from 'to-ico'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

const MASCOT_SVG = join(root, 'assets', 'logo-mascot.svg')
const MARK_SVG = join(root, 'assets', 'logo-mark.svg')
const LIGHT_SVG = join(root, 'assets', 'logo-mascot-light.svg')
const BUILD = join(root, 'build')
const PUBLIC = join(root, 'public')

async function ensureDir(p) {
  await mkdir(p, { recursive: true })
}

/**
 * Rasterize SVG at a specific size by rendering at that exact resolution
 * (not by downscaling a big bitmap). This preserves crispness because the
 * SVG's pixel-art rects fall on whole pixels of the target canvas.
 *
 * For very small sizes (<= 48), we use a simplified variant that prefers
 * solid shapes so the result stays readable in taskbar/tray at 16x16.
 */
async function svgToPng(svgPath, size) {
  const svg = await readFile(svgPath)
  // density scales the internal rasterization; keep it high for large icons,
  // lower for small ones where super-sampling causes excessive blur.
  const density = size >= 256 ? 384 : size >= 64 ? 256 : 192
  return sharp(svg, { density })
    .resize(size, size, {
      fit: 'contain',
      kernel: 'lanczos3',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toBuffer()
}

async function main() {
  await ensureDir(BUILD)
  await ensureDir(PUBLIC)

  console.log('→ rasterizing mascot to PNG sizes...')
  const sizes = [16, 24, 32, 48, 64, 128, 180, 192, 256, 512, 1024]
  const pngs = {}
  for (const s of sizes) {
    pngs[s] = await svgToPng(MASCOT_SVG, s)
    console.log(`   ${s}x${s}`)
  }

  console.log('→ rasterizing small-size variants (mark) for crisp tray/taskbar...')
  const markSmall = {
    16: await svgToPng(MARK_SVG, 16),
    24: await svgToPng(MARK_SVG, 24),
    32: await svgToPng(MARK_SVG, 32),
  }

  // Linux / electron-builder source
  await writeFile(join(BUILD, 'icon.png'), pngs[512])
  await writeFile(join(BUILD, 'icon-1024.png'), pngs[1024])
  // Dedicated tray icon (small, crisp) — write both places:
  //   build/  → used by electron-builder at build-time
  //   electron/assets/ → shipped INSIDE the packaged app for runtime use
  await writeFile(join(BUILD, 'tray-icon.png'), pngs[32])
  await writeFile(join(BUILD, 'tray-icon@2x.png'), pngs[64])
  const electronAssets = join(root, 'electron', 'assets')
  await ensureDir(electronAssets)
  await writeFile(join(electronAssets, 'tray-icon.png'), pngs[32])
  await writeFile(join(electronAssets, 'tray-icon@2x.png'), pngs[64])
  await writeFile(join(electronAssets, 'icon.png'), pngs[512])

  // PWA-style
  await writeFile(join(PUBLIC, 'icon-192.png'), pngs[192])
  await writeFile(join(PUBLIC, 'icon-512.png'), pngs[512])
  await writeFile(join(PUBLIC, 'apple-touch-icon.png'), pngs[180])

  console.log('→ building Windows .ico (multi-resolution: 16/24/32/48/64/128/256)...')
  // to-ico wants an array of PNG buffers at common Windows sizes.
  // We use the 'mark' variant at <=32 so taskbar/explorer look sharp.
  const icoBuffers = [
    markSmall[16],
    markSmall[24],
    markSmall[32],
    pngs[48],
    pngs[64],
    pngs[128],
    pngs[256],
  ]
  const ico = await toIco(icoBuffers)
  await writeFile(join(BUILD, 'icon.ico'), ico)

  // Favicon: use mark at all sizes for compact browser-tab display
  const favIcoBuffers = [
    markSmall[16],
    markSmall[24],
    markSmall[32],
    await svgToPng(MARK_SVG, 48),
    await svgToPng(MARK_SVG, 64),
  ]
  await writeFile(join(PUBLIC, 'favicon.ico'), await toIco(favIcoBuffers))

  console.log('→ building macOS .icns...')
  const icns = png2icons.createICNS(pngs[1024], png2icons.BEZIER, 0)
  if (!icns) throw new Error('Failed to build .icns')
  await writeFile(join(BUILD, 'icon.icns'), icns)

  console.log('→ copying SVG favicons...')
  await writeFile(join(PUBLIC, 'favicon.svg'), await readFile(MARK_SVG))
  await writeFile(join(PUBLIC, 'logo.svg'), await readFile(MASCOT_SVG))
  await writeFile(join(PUBLIC, 'logo-light.svg'), await readFile(LIGHT_SVG))

  console.log('\n✓ all icons generated')
  console.log('   build/icon.png, icon.ico (multi-res), icon.icns, tray-icon.png')
  console.log('   public/favicon.ico, favicon.svg, logo.svg, apple-touch-icon.png, icon-{192,512}.png')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
