import { afterEach, describe, expect, it, vi } from 'vitest'
import { getSafeStorage, safeSetItem } from './safe-storage'

/** Mirrors what Safari's "Block all cookies" and Firefox's strict site-data
 * blocking do: reading the `localStorage` *property* throws, before any
 * method on it is even called. */
function blockLocalStorage(): () => void {
  const original = Object.getOwnPropertyDescriptor(window, 'localStorage')!
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    get() {
      throw new DOMException('The operation is insecure.', 'SecurityError')
    },
  })
  return () => Object.defineProperty(window, 'localStorage', original)
}

describe('getSafeStorage', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns the storage object when it is reachable', () => {
    expect(getSafeStorage()).toBe(window.localStorage)
  })

  it('returns null instead of throwing when the localStorage property itself throws', () => {
    const unblock = blockLocalStorage()
    try {
      expect(() => getSafeStorage()).not.toThrow()
      expect(getSafeStorage()).toBeNull()
    } finally {
      unblock()
    }
  })
})

describe('safeSetItem', () => {
  afterEach(() => {
    window.localStorage.clear()
    vi.restoreAllMocks()
  })

  it('writes when storage is reachable', () => {
    safeSetItem(window.localStorage, 'k', 'v')
    expect(window.localStorage.getItem('k')).toBe('v')
  })

  it('swallows and logs a failed setItem instead of throwing', () => {
    const storage = {
      setItem: () => {
        throw new DOMException('The quota has been exceeded.', 'QuotaExceededError')
      },
    } as unknown as Storage
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => safeSetItem(storage, 'k', 'v')).not.toThrow()
    expect(errorSpy).toHaveBeenCalled()
  })

  it('is a no-op when storage is null', () => {
    expect(() => safeSetItem(null, 'k', 'v')).not.toThrow()
  })
})
