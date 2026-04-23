import { forwardRef } from 'react'
import { cn } from '../lib/cn'

type Props = {
  text: string
  empty?: string
  className?: string
  fontSize?: number
}

const AsciiOutput = forwardRef<HTMLPreElement, Props>(function AsciiOutput(
  { text, empty = '// output will appear here', className, fontSize = 14 },
  ref,
) {
  return (
    <pre
      ref={ref}
      className={cn(
        'font-code whitespace-pre overflow-auto leading-[1] p-4 pixel-panel min-h-[280px] glow',
        className,
      )}
      style={{ fontSize, color: 'var(--fg)', background: 'var(--panel)' }}
    >
      {text || <span style={{ color: 'var(--dim)' }}>{empty}</span>}
    </pre>
  )
})

export default AsciiOutput
