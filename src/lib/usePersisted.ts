import { useEffect, useRef, useState } from 'react'

const PREFIX = 'miascii:'

// Module-level pub/sub: keeps every mounted usePersisted(key) in sync across
// the whole app on same-window writes. Also re-fires when another tab writes
// via the native 'storage' event.
type Listener = (v: unknown) => void
const listeners = new Map<string, Set<Listener>>()

function subscribe(storageKey: string, fn: Listener): () => void {
  let set = listeners.get(storageKey)
  if (!set) { set = new Set(); listeners.set(storageKey, set) }
  set.add(fn)
  return () => { set!.delete(fn) }
}

function broadcast(storageKey: string, value: unknown): void {
  const set = listeners.get(storageKey)
  if (!set) return
  set.forEach((fn) => fn(value))
}

// Listen to cross-tab writes
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (!e.key || !e.key.startsWith(PREFIX)) return
    try {
      const v = e.newValue == null ? null : JSON.parse(e.newValue)
      broadcast(e.key, v)
    } catch { /* ignore parse errors */ }
  })
}

/**
 * Drop-in replacement for useState that persists its value to localStorage.
 * Stored under `miascii:<key>` as JSON. Multiple components using the same
 * key stay in sync: any write is broadcast to all subscribers in the same
 * window AND picked up from other tabs via the `storage` event.
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

  // The last value known to be in storage (or the one we just received).
  // Writes happen only when `value` differs from it. A "first render" flag
  // would break under StrictMode, which re-runs effects on mount and would
  // overwrite a saved value with the default.
  const stored = useRef<T>(value)

  // Subscribe to broadcasts from siblings writing the same key
  useEffect(() => {
    return subscribe(storageKey, (v) => {
      stored.current = v as T
      setValue(v as T)
    })
  }, [storageKey])

  // Persist + broadcast on value change
  useEffect(() => {
    if (Object.is(stored.current, value)) return
    stored.current = value
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(value))
    } catch {
      /* ignore */
    }
    broadcast(storageKey, value)
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
