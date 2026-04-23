import { forwardRef, memo } from 'react'
import { cn } from '../lib/cn'
import type { CellColor } from '../lib/ascii'

type Props = {
  text: string
  colors: CellColor[] | null
  cols: number
  rows: number
  fontSize?: number
  className?: string
  empty?: string
}

/**
 * Renders ASCII output either as plain text (fast) or with per-cell color spans.
 * Keeps the same pixel-panel styling as AsciiOutput.
 */
const AsciiColorOutput = forwardRef<HTMLPreElement, Props>(function AsciiColorOutput(
  { text, colors, cols, rows, fontSize = 12, className, empty = '// drop an image to begin' },
  ref,
) {
  const hasColor = !!colors && colors.length === cols * rows

  return (
    <pre
      ref={ref}
      className={cn(
        'font-code whitespace-pre overflow-auto leading-[1] p-4 pixel-panel min-h-[280px] glow',
        className,
      )}
      style={{ fontSize, color: 'var(--fg)', background: 'var(--panel)' }}
    >
      {!text && <span style={{ color: 'var(--dim)' }}>{empty}</span>}
      {text && !hasColor && text}
      {text && hasColor && <ColoredGrid text={text} colors={colors!} cols={cols} rows={rows} />}
    </pre>
  )
})

export default AsciiColorOutput

const ColoredGrid = memo(function ColoredGrid({
  text,
  colors,
  cols,
  rows,
}: {
  text: string
  colors: CellColor[]
  cols: number
  rows: number
}) {
  const lines = text.split('\n')
  const out: React.ReactNode[] = []
  for (let y = 0; y < rows; y++) {
    const line = lines[y] ?? ''
    const chunks: React.ReactNode[] = []
    // Group adjacent characters that share a color to cut span count ~10x.
    let runStart = 0
    let runColor = colors[y * cols] ?? [255, 255, 255]
    for (let x = 1; x <= cols; x++) {
      const c = x < cols ? colors[y * cols + x] : null
      const same =
        c && c[0] === runColor[0] && c[1] === runColor[1] && c[2] === runColor[2]
      if (!same) {
        const [r, g, b] = runColor
        chunks.push(
          <span key={`${y}-${runStart}`} style={{ color: `rgb(${r},${g},${b})` }}>
            {line.slice(runStart, x)}
          </span>,
        )
        runStart = x
        if (c) runColor = c
      }
    }
    out.push(
      <div key={y} style={{ display: 'block' }}>
        {chunks}
      </div>,
    )
  }
  return <>{out}</>
})
