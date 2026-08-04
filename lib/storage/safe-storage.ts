/**
 * Reading the `window.localStorage` *property* — not just calling a method
 * on it — throws `SecurityError` in Safari with "Block all cookies" and in
 * Firefox with all site data blocked. Any code that reaches for
 * `window.localStorage` directly has no way to recover from that; this is
 * the one place that owns the try/catch, so every caller degrades instead of
 * throwing.
 */
export function getSafeStorage(): Storage | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage
  } catch {
    return null
  }
}

/**
 * A write that never throws: a full quota, private-mode storage, or a
 * browser blocking site data all fail silently — logged, not propagated —
 * instead of escaping into a React event handler or render.
 */
export function safeSetItem(storage: Storage | null, key: string, value: string): void {
  try {
    storage?.setItem(key, value)
  } catch (error) {
    console.error(`Failed to write "${key}" to storage`, error)
  }
}
