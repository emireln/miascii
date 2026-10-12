import { forwardRef } from 'react'
import { cn } from '../lib/cn'

type Props = {
  text: string
  empty?: string
  className?: string
  fontSize?: number
  /** Swap ink and paper, e.g. for a light-on-dark figlet banner. */
  inverted?: boolean
}

const AsciiOutput = forwardRef<HTMLPreElement, Props>(function AsciiOutput(
  { text, empty = '', className, fontSize = 14, inverted = false },
  ref,
) {
  return (
    <pre
      ref={ref}
      className={cn('ascii-screen', inverted && 'is-inverted', className)}
      style={{ fontSize }}
    >
      {text || (empty && <span className="ascii-empty">{empty}</span>)}
    </pre>
  )
})

export default AsciiOutput
