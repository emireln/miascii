import type { ReactNode } from 'react'

/** Inline error or status message. role="alert" makes screen readers announce it. */
export default function Notice({ children }: { children: ReactNode }) {
  return <div role="alert" className="notice">{children}</div>
}
