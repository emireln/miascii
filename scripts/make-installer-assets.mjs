// Converts public/banner.png into the NSIS sidebar BMPs at the correct size.
// electron-builder auto-detects these files under build/ and injects them
// into the NSIS installer without any config change.
//
// NSIS sidebar spec: 164 x 314 px, 24-bit BMP, no alpha.
import { readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const SRC = join(root, 'public', 'banner.png')
const BUILD = join(root, 'build')

/**
 * Encodes raw RGB pixels into a 24-bit, bottom-up, uncompressed BMP.
 * Needed because `sharp` doesn't emit BMP, and NSIS installer graphics
 * must be BMP.
 */
function rgbToBmp(rgb, width, height) {
  const rowUnpadded = width * 3
  const padding = (4 - (rowUnpadded % 4)) % 4
  const rowSize = rowUnpadded + padding
  const pixelDataSize = rowSize * height
  const fileSize = 54 + pixelDataSize

  const out = Buffer.alloc(fileSize)
  // BITMAPFILEHEADER
  out.write('BM', 0)
  out.writeUInt32LE(fileSize, 2)
  out.writeUInt32LE(0, 6)
  out.writeUInt32LE(54, 10)
  // BITMAPINFOHEADER
  out.writeUInt32LE(40, 14)
  out.writeInt32LE(width, 18)
  out.writeInt32LE(height, 22) // positive = bottom-up
  out.writeUInt16LE(1, 26)
  out.writeUInt16LE(24, 28)
  out.writeUInt32LE(0, 30) // BI_RGB
  out.writeUInt32LE(pixelDataSize, 34)
  out.writeInt32LE(2835, 38) // 72 DPI horiz
  out.writeInt32LE(2835, 42) // 72 DPI vert
  out.writeUInt32LE(0, 46)
  out.writeUInt32LE(0, 50)

  // Pixel rows written bottom-to-top, with BGR order
  for (let y = 0; y < height; y++) {
    const srcRow = (height - 1 - y) * width * 3
    const dstRow = 54 + y * rowSize
    for (let x = 0; x < width; x++) {
      const r = rgb[srcRow + x * 3]
      const g = rgb[srcRow + x * 3 + 1]
      const b = rgb[srcRow + x * 3 + 2]
      out[dstRow + x * 3]     = b
      out[dstRow + x * 3 + 1] = g
      out[dstRow + x * 3 + 2] = r
    }
    // row padding is already zeroed by Buffer.alloc
  }
  return out
}

async function makeBmp(outName, width, height) {
  const src = await readFile(SRC)
  const { data } = await sharp(src)
    .resize(width, height, { fit: 'cover', position: 'centre' })
    .removeAlpha()
    .flatten({ background: { r: 10, g: 10, b: 10 } })
    .raw()
    .toBuffer({ resolveWithObject: true })
  const bmp = rgbToBmp(data, width, height)
  await writeFile(join(BUILD, outName), bmp)
  console.log(`   ${outName}  ${width}x${height}`)
}

async function main() {
  console.log('→ generating NSIS installer graphics from public/banner.png')
  // Only the welcome/completion sidebars use the banner.
  // We intentionally DO NOT generate installerHeader.bmp so NSIS falls back
  // to its default header (plain) on the inner pages like "Choose Installation
  // Options", where a stretched banner looks bad.
  await makeBmp('installerSidebar.bmp',     164, 314)
  await makeBmp('uninstallerSidebar.bmp',   164, 314)
  console.log('\n✓ installer graphics ready — next electron-builder run will bake them in')
}

main().catch((e) => { console.error(e); process.exit(1) })
