// Core brightness → ASCII mapping utilities (shared by image + video modules).

export const DENSITY_PRESETS = {
  standard: 'Ñ@#W$9876543210?!abc;:+=-,._ ',
  classic: ' .:-=+*#%@',
  blocks: ' ░▒▓█',
  short: ' .:-=+*#%@Ñ',
  long: "$@B%8&WM#*oahkbdpqwmZO0QLCJUYXzcvunxrjft/\\|()1{}[]?-_+~<>i!lI;:,\"^`'. ",
  binary: ' █',
  dots: ' .·•●',
  hash: ' .-+#',
} as const

export type DensityKey = keyof typeof DENSITY_PRESETS

export type CellColor = [number, number, number]

export type AsciiResult = {
  text: string
  cols: number
  rows: number
  colors: CellColor[] | null // row-major; null when color mode is 'off'
}

export type DitherMode = 'none' | 'floyd-steinberg' | 'ordered'
export type ColorMode = 'off' | 'full' | 'duotone'

export type AsciiOptions = {
  cols: number
  density: string
  invert: boolean
  color: ColorMode
  duotoneA?: string // hex, shadow color
  duotoneB?: string // hex, highlight color
  charAspect?: number // cell height/width ratio
  contrast?: number // 0..2.5
  brightness?: number // -0.5..0.5
  gamma?: number // 0.3..3
  blur?: number // 0..3 (canvas filter px)
  dither?: DitherMode
  edges?: boolean
  edgeThreshold?: number // 0..1
  flipH?: boolean
  flipV?: boolean
}

// 4x4 Bayer matrix normalized to [0,1) — classic ordered-dither threshold map.
const BAYER_4 = [
  0, 8, 2, 10,
  12, 4, 14, 6,
  3, 11, 1, 9,
  15, 7, 13, 5,
].map((v) => v / 16)

const EDGE_CHARS = ['-', '/', '|', '\\']

export function sourceToAscii(
  source: CanvasImageSource & { width?: number; height?: number; videoWidth?: number; videoHeight?: number },
  opts: AsciiOptions,
  scratch?: HTMLCanvasElement,
): AsciiResult | null {
  const srcW = (source as HTMLVideoElement).videoWidth || (source as HTMLImageElement).width || 0
  const srcH = (source as HTMLVideoElement).videoHeight || (source as HTMLImageElement).height || 0
  if (!srcW || !srcH) return null

  const charAspect = opts.charAspect ?? 2
  const cols = Math.max(8, Math.min(500, Math.floor(opts.cols)))
  const rows = Math.max(4, Math.floor((srcH / srcW) * cols / charAspect))

  const canvas = scratch ?? document.createElement('canvas')
  canvas.width = cols
  canvas.height = rows
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return null

  ctx.save()
  ctx.imageSmoothingEnabled = true
  ctx.filter = opts.blur && opts.blur > 0 ? `blur(${opts.blur}px)` : 'none'
  const sx = opts.flipH ? -1 : 1
  const sy = opts.flipV ? -1 : 1
  if (sx !== 1 || sy !== 1) {
    ctx.translate(sx === -1 ? cols : 0, sy === -1 ? rows : 0)
    ctx.scale(sx, sy)
  }
  ctx.drawImage(source as CanvasImageSource, 0, 0, cols, rows)
  ctx.restore()
  // Reset filter (only needed if additional ops come)
  ctx.filter = 'none'

  const { data } = ctx.getImageData(0, 0, cols, rows)

  // 1) Build luminance + rgb grids (0..1)
  const total = cols * rows
  const lum = new Float32Array(total)
  const alpha = new Float32Array(total)
  const rArr = new Uint8ClampedArray(total)
  const gArr = new Uint8ClampedArray(total)
  const bArr = new Uint8ClampedArray(total)

  const c = opts.contrast ?? 1
  const b = opts.brightness ?? 0
  const gamma = opts.gamma ?? 1

  for (let i = 0; i < total; i++) {
    const p = i * 4
    const r = data[p]
    const g = data[p + 1]
    const bl = data[p + 2]
    const a = data[p + 3] / 255
    rArr[i] = r
    gArr[i] = g
    bArr[i] = bl
    alpha[i] = a
    let l = (0.2126 * r + 0.7152 * g + 0.0722 * bl) / 255
    // gamma
    if (gamma !== 1) l = Math.pow(l, 1 / gamma)
    // contrast + brightness
    l = (l - 0.5) * c + 0.5 + b
    lum[i] = clamp01(l) * a
  }

  // 2) Optional Sobel edge detection
  let edgeMag: Float32Array | null = null
  let edgeChar: Uint8Array | null = null
  if (opts.edges) {
    edgeMag = new Float32Array(total)
    edgeChar = new Uint8Array(total)
    for (let y = 1; y < rows - 1; y++) {
      for (let x = 1; x < cols - 1; x++) {
        const i = y * cols + x
        const tl = lum[i - cols - 1], tc = lum[i - cols], tr = lum[i - cols + 1]
        const ml = lum[i - 1],                              mr = lum[i + 1]
        const bll = lum[i + cols - 1], bc = lum[i + cols], br = lum[i + cols + 1]
        const gx = -tl - 2 * ml - bll + tr + 2 * mr + br
        const gy = -tl - 2 * tc - tr + bll + 2 * bc + br
        const mag = Math.sqrt(gx * gx + gy * gy) / 4 // normalize roughly
        edgeMag[i] = mag
        // Direction → char
        const ang = Math.atan2(gy, gx) // -π..π
        // Map to 4 bins: -, /, |, \
        let a4 = Math.round(((ang + Math.PI) / Math.PI) * 4) % 4
        if (a4 < 0) a4 += 4
        edgeChar[i] = a4
      }
    }
  }

  // 3) Map luminance → ramp index (with optional dither)
  const ramp = opts.density || ' .:-=+*#%@'
  const maxIdx = ramp.length - 1
  const idxArr = new Int16Array(total)

  if (opts.dither === 'floyd-steinberg') {
    // Work on a mutable copy to propagate error
    const buf = new Float32Array(lum)
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const i = y * cols + x
        const old = clamp01(buf[i])
        const q = Math.round(old * maxIdx) / maxIdx
        const err = old - q
        idxArr[i] = Math.round(q * maxIdx)
        // distribute
        if (x + 1 < cols)           buf[i + 1]            += err * (7 / 16)
        if (y + 1 < rows) {
          if (x - 1 >= 0)           buf[i + cols - 1]     += err * (3 / 16)
                                    buf[i + cols]         += err * (5 / 16)
          if (x + 1 < cols)         buf[i + cols + 1]     += err * (1 / 16)
        }
      }
    }
  } else if (opts.dither === 'ordered') {
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const i = y * cols + x
        const bias = (BAYER_4[(y & 3) * 4 + (x & 3)] - 0.5) * (1 / (maxIdx + 1))
        const l = clamp01(lum[i] + bias)
        idxArr[i] = Math.round(l * maxIdx)
      }
    }
  } else {
    for (let i = 0; i < total; i++) {
      idxArr[i] = Math.round(lum[i] * maxIdx)
    }
  }

  // 4) Produce text + colors
  const edgeT = opts.edgeThreshold ?? 0.25
  const colors: CellColor[] | null = opts.color !== 'off' ? new Array(total) : null
  const duoA = opts.color === 'duotone' ? hexToRgb(opts.duotoneA ?? '#000000') : null
  const duoB = opts.color === 'duotone' ? hexToRgb(opts.duotoneB ?? '#ffffff') : null

  let text = ''
  for (let y = 0; y < rows; y++) {
    let line = ''
    for (let x = 0; x < cols; x++) {
      const i = y * cols + x
      let idx = idxArr[i]
      // invert swaps dark↔light mapping
      if (!opts.invert) idx = maxIdx - idx

      let ch: string
      if (edgeMag && edgeMag[i] > edgeT) {
        ch = EDGE_CHARS[edgeChar![i]]
      } else {
        ch = ramp[idx]
      }
      line += ch

      if (colors) {
        if (opts.color === 'full') {
          colors[i] = [rArr[i], gArr[i], bArr[i]]
        } else if (duoA && duoB) {
          const t = lum[i]
          colors[i] = [
            Math.round(duoA[0] + (duoB[0] - duoA[0]) * t),
            Math.round(duoA[1] + (duoB[1] - duoA[1]) * t),
            Math.round(duoA[2] + (duoB[2] - duoA[2]) * t),
          ]
        }
      }
    }
    text += line + '\n'
  }

  return { text: text.replace(/\n$/, ''), cols, rows, colors }
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  const n = h.length === 3
    ? h.split('').map((c) => c + c).join('')
    : h.padEnd(6, '0').slice(0, 6)
  const r = parseInt(n.slice(0, 2), 16) || 0
  const g = parseInt(n.slice(2, 4), 16) || 0
  const b = parseInt(n.slice(4, 6), 16) || 0
  return [r, g, b]
}

export function loadImageFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = (e) => {
      URL.revokeObjectURL(url)
      reject(e)
    }
    img.src = url
  })
}
