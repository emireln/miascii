// Rasterize an AsciiResult to a canvas for recording / export.
// Uses a monospace font so every character cell has equal width.

import type { AsciiResult } from './ascii'

export type CanvasPaintOptions = {
  fontPx: number
  fontFamily?: string
  fg: string // default foreground when colors are null
  bg: string
}

export function measureAsciiCanvas(
  result: AsciiResult,
  opts: CanvasPaintOptions,
): { width: number; height: number; cellW: number; cellH: number } {
  const cellH = Math.ceil(opts.fontPx * 1.05)
  // monospace char width is ~0.6 * fontPx for most fonts; measure once for accuracy.
  const probe = document.createElement('canvas').getContext('2d')!
  probe.font = `${opts.fontPx}px ${opts.fontFamily ?? 'ui-monospace, Menlo, monospace'}`
  const cellW = probe.measureText('M').width
  return {
    width: Math.ceil(cellW * result.cols),
    height: cellH * result.rows,
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
  ctx.fillStyle = opts.bg
  ctx.fillRect(0, 0, width, height)
  ctx.font = `${opts.fontPx}px ${opts.fontFamily ?? 'ui-monospace, Menlo, monospace'}`
  ctx.textBaseline = 'top'

  const lines = result.text.split('\n')
  const { colors, cols, rows } = result

  if (!colors) {
    ctx.fillStyle = opts.fg
    for (let y = 0; y < rows; y++) {
      const line = lines[y] ?? ''
      ctx.fillText(line, 0, y * cellH)
    }
    return
  }

  // Color path: draw per-run to cut fillText calls by ~10x
  for (let y = 0; y < rows; y++) {
    const line = lines[y] ?? ''
    let runStart = 0
    let runColor = colors[y * cols] ?? [255, 255, 255]
    for (let x = 1; x <= cols; x++) {
      const c = x < cols ? colors[y * cols + x] : null
      const same = c && c[0] === runColor[0] && c[1] === runColor[1] && c[2] === runColor[2]
      if (!same) {
        ctx.fillStyle = `rgb(${runColor[0]},${runColor[1]},${runColor[2]})`
        ctx.fillText(line.slice(runStart, x), runStart * cellW, y * cellH)
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
