import type { ReactNode } from 'react'

/**
 * Two-pane tool. Output comes first in the DOM so it stays on top when the
 * window is narrow; on wide windows CSS places the controls on the left.
 */
export default function ToolLayout({
  top,
  output,
  controls,
}: {
  top?: ReactNode
  output: ReactNode
  controls: ReactNode
}) {
  return (
    <div className="tool">
      {top && <div className="tool-top">{top}</div>}
      <div className="tool-body">
        <section className="tool-output">{output}</section>
        <aside className="tool-controls">{controls}</aside>
      </div>
    </div>
  )
}
