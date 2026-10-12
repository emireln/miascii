// Imperative ASCII rendering for high-FPS sources (video/webcam) without
// triggering React re-renders each frame.

import type { AsciiResult } from './ascii'

function escapeHtml(s: string): string {
  return s.replace(/[&<>]/g, (c) => (c === '&' ? '&amp;' : c === '<' ? '&lt;' : '&gt;'))
}

export function paintAsciiToPre(pre: HTMLPreElement, result: AsciiResult): void {
  if (!result.colors) {
    pre.textContent = result.text
    return
  }
  const { text, colors, cols, rows } = result
  const lines = text.split('\n')
  let html = ''
  for (let y = 0; y < rows; y++) {
    // Slice by code point so a multi-unit glyph is never split in half.
    const cells = Array.from(lines[y] ?? '')
    let runStart = 0
    let runColor = colors[y * cols] ?? [255, 255, 255]
    for (let x = 1; x <= cols; x++) {
      const c = x < cols ? colors[y * cols + x] : null
      const same = c && c[0] === runColor[0] && c[1] === runColor[1] && c[2] === runColor[2]
      if (!same) {
        const [r, g, b] = runColor
        html += `<span style="color:rgb(${r},${g},${b})">${escapeHtml(cells.slice(runStart, x).join(''))}</span>`
        runStart = x
        if (c) runColor = c
      }
    }
    html += '\n'
  }
  pre.innerHTML = html
}
