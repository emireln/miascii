import type { AsciiResult } from './ascii'
import { paintAsciiToCanvas } from './asciiCanvas'

/** Clipboard write, with a fallback for non-secure (plain http) origins. */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    const field = document.createElement('textarea')
    field.value = text
    field.setAttribute('readonly', '')
    field.style.position = 'fixed'
    field.style.opacity = '0'
    document.body.appendChild(field)
    field.select()
    const ok = document.execCommand('copy')
    field.remove()
    return ok
  }
}

export function downloadText(text: string, filename = 'miascii.txt') {
  try {
    downloadBlob(new Blob([text], { type: 'text/plain;charset=utf-8' }), filename)
  } catch (err) {
    console.error('Failed to download text:', err)
  }
}

/**
 * Paints the grid straight onto a canvas with the app's mono font and the
 * preview's colors. Crisper than a DOM screenshot and it keeps per-cell color.
 */
export async function downloadAsciiPng(result: AsciiResult, preview: HTMLElement, filename = 'miascii.png') {
  try {
    const style = getComputedStyle(preview)
    await document.fonts.load('24px "Fira Code"')
    const canvas = document.createElement('canvas')
    paintAsciiToCanvas(canvas, result, { fontPx: 24, pad: 24, fg: style.color, bg: style.backgroundColor })
    canvas.toBlob((blob) => { if (blob) downloadBlob(blob, filename) }, 'image/png')
  } catch (err) {
    console.error('Failed to download PNG:', err)
  }
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  setTimeout(() => { a.remove(); URL.revokeObjectURL(url) }, 10_000)
}
