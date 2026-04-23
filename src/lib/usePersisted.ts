import { useEffect, useRef, useState } from 'react'

const PREFIX = 'miascii:'

/**
 * Drop-in replacement for useState that persists its value to localStorage.
 * Stored under `miascii:<key>` as JSON. Silently falls back to `initial`
 * if storage is unavailable or the stored value can't be parsed.
 */
export function usePersisted<T>(
  key: string,
  initial: T,
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const storageKey = PREFIX + key
  const [value, setValue] = useState<T>(() => {
    if (typeof window === 'undefined') return initial
    try {
      const raw = window.localStorage.getItem(storageKey)
      if (raw != null) return JSON.parse(raw) as T
    } catch {
      /* ignore */
    }
    return initial
  })

  // Avoid a redundant write on first render
  const first = useRef(true)
  useEffect(() => {
    if (first.current) { first.current = false; return }
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(value))
    } catch {
      /* ignore */
    }
  }, [storageKey, value])

  return [value, setValue]
}

export function clearPersisted(): void {
  try {
    for (let i = window.localStorage.length - 1; i >= 0; i--) {
      const k = window.localStorage.key(i)
      if (k && k.startsWith(PREFIX)) window.localStorage.removeItem(k)
    }
  } catch {
    /* ignore */
  }
}
