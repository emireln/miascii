// Rasterize an AsciiResult to a canvas for recording and PNG export.
// A monospace font keeps every character cell the same width.

import type { AsciiResult } from './ascii'

export const MONO_FONT = '"Fira Code", ui-monospace, Menlo, Consolas, monospace'

export type CanvasPaintOptions = {
  fontPx: number
  fontFamily?: string
  fg: string // default foreground when colors are null
  bg: string
  pad?: number // outer margin in px, applied on every side
}

let probe: CanvasRenderingContext2D | null = null

export function measureAsciiCanvas(
  result: AsciiResult,
  opts: CanvasPaintOptions,
): { width: number; height: number; cellW: number; cellH: number } {
  if (!probe) probe = document.createElement('canvas').getContext('2d')
  probe!.font = `${opts.fontPx}px ${opts.fontFamily ?? MONO_FONT}`
  const cellW = probe!.measureText('M').width
  const cellH = Math.ceil(opts.fontPx * 1.05)
  const pad = (opts.pad ?? 0) * 2
  return {
    width: Math.ceil(cellW * result.cols) + pad,
    height: cellH * result.rows + pad,
    cellW,
    cellH,
  }
}

export function paintAsciiToCanvas(
  canvas: HTMLCanvasElement,
  result: AsciiResult,
  opts: CanvasPaintOptions,
): void {
  const { cellW, cellH, width, height } = measureAsciiCanvas(result, opts)
  if (canvas.width !== width) canvas.width = width
  if (canvas.height !== height) canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const pad = opts.pad ?? 0
  ctx.fillStyle = opts.bg
  ctx.fillRect(0, 0, width, height)
  ctx.font = `${opts.fontPx}px ${opts.fontFamily ?? MONO_FONT}`
  ctx.textBaseline = 'top'

  const lines = result.text.split('\n')
  const { colors, cols, rows } = result

  if (!colors) {
    ctx.fillStyle = opts.fg
    for (let y = 0; y < rows; y++) {
      ctx.fillText(lines[y] ?? '', pad, pad + y * cellH)
    }
    return
  }

  // Color path: one fillText per run of equal color, which cuts calls ~10x.
  // Slice by code point so a multi-unit glyph stays whole.
  for (let y = 0; y < rows; y++) {
    const cells = Array.from(lines[y] ?? '')
    let runStart = 0
    let runColor = colors[y * cols] ?? [255, 255, 255]
    for (let x = 1; x <= cols; x++) {
      const c = x < cols ? colors[y * cols + x] : null
      const same = c && c[0] === runColor[0] && c[1] === runColor[1] && c[2] === runColor[2]
      if (!same) {
        ctx.fillStyle = `rgb(${runColor[0]},${runColor[1]},${runColor[2]})`
        ctx.fillText(cells.slice(runStart, x).join(''), pad + runStart * cellW, pad + y * cellH)
        runStart = x
        if (c) runColor = c
      }
    }
  }
}

export type RecorderMime = 'video/mp4' | 'video/webm;codecs=vp9' | 'video/webm;codecs=vp8' | 'video/webm'

export function pickSupportedMime(): { mime: RecorderMime; ext: 'mp4' | 'webm' } | null {
  const candidates: { mime: RecorderMime; ext: 'mp4' | 'webm' }[] = [
    { mime: 'video/mp4', ext: 'mp4' },
    { mime: 'video/webm;codecs=vp9', ext: 'webm' },
    { mime: 'video/webm;codecs=vp8', ext: 'webm' },
    { mime: 'video/webm', ext: 'webm' },
  ]
  for (const c of candidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(c.mime)) {
      return c
    }
  }
  return null
}
