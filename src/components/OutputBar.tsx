import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Copy } from 'lucide-react'
import { useT } from '../i18n'
import { copyText } from '../lib/export'

/** Heading row above an output screen: title, optional status, and action buttons. */
export function OutputBar({ title, status, children }: { title: string; status?: ReactNode; children?: ReactNode }) {
  return (
    <div className="output-bar">
      <div className="output-heading">
        <h2 className="pixel-label output-title">{title}</h2>
        {status && <div className="output-status">{status}</div>}
      </div>
      {children && <div className="output-actions">{children}</div>}
    </div>
  )
}

/** Copies text read at click time, so the latest frame is what gets copied. */
export function CopyButton({ getText, label, disabled }: { getText: () => string; label?: string; disabled?: boolean }) {
  const t = useT()
  const [state, setState] = useState<'idle' | 'done' | 'failed'>('idle')
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const onClick = async () => {
    const ok = await copyText(getText())
    setState(ok ? 'done' : 'failed')
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setState('idle'), 1400)
  }

  const text = state === 'done'
    ? t('common.copied')
    : state === 'failed'
      ? t('common.copyFailed')
      : label ?? t('common.copy')

  return (
    <button type="button" className="pixel-btn pixel-btn--sm" onClick={onClick} disabled={disabled}>
      <Copy size={14} aria-hidden="true" />
      {text}
    </button>
  )
}
