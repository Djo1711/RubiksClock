import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { I18nProvider, useI18n } from './i18n-provider'
import { dictionaries, LOCALE_STORAGE_KEY } from '@/lib/i18n/dictionaries'

function mount() {
  return renderHook(() => useI18n(), {
    wrapper: ({ children }) => <I18nProvider>{children}</I18nProvider>,
  })
}

describe('I18nProvider', () => {
  beforeEach(() => {
    window.localStorage.clear()
    vi.spyOn(navigator, 'language', 'get').mockReturnValue('en-US')
  })

  afterEach(() => {
    vi.restoreAllMocks()
    window.localStorage.clear()
  })

  it('falls back to the browser language when nothing is stored', () => {
    const { result } = mount()
    expect(result.current.locale).toBe('en')
    expect(result.current.t).toBe(dictionaries.en)
  })

  it('prefers a French browser language over English', () => {
    vi.spyOn(navigator, 'language', 'get').mockReturnValue('fr-FR')
    expect(mount().result.current.locale).toBe('fr')
  })

  it('prefers the stored locale over the browser language', () => {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, 'fr')
    expect(mount().result.current.locale).toBe('fr')
  })

  it('re-reads the locale when setLocale runs in this tab, and persists it', () => {
    const { result } = mount()
    expect(result.current.locale).toBe('en')
    act(() => {
      result.current.setLocale('fr')
    })
    expect(result.current.locale).toBe('fr')
    expect(result.current.t).toBe(dictionaries.fr)
    expect(window.localStorage.getItem(LOCALE_STORAGE_KEY)).toBe('fr')
  })

  it('re-reads the locale when another tab writes the key', () => {
    const { result } = mount()
    act(() => {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, 'fr')
      window.dispatchEvent(new StorageEvent('storage', { key: LOCALE_STORAGE_KEY }))
    })
    expect(result.current.locale).toBe('fr')
  })

  // Safari's "Block all cookies" and Firefox's strict site-data blocking
  // throw SecurityError on reading the `localStorage` property itself, from
  // inside getSnapshot during the provider's render. With no error boundary
  // above it in the tree, an unguarded read here would blank the page.
  it('renders with the browser-language fallback instead of throwing when localStorage is blocked', () => {
    const original = Object.getOwnPropertyDescriptor(window, 'localStorage')!
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get() {
        throw new DOMException('The operation is insecure.', 'SecurityError')
      },
    })
    try {
      const { result } = mount()
      expect(result.current.locale).toBe('en')
    } finally {
      Object.defineProperty(window, 'localStorage', original)
    }
  })
})
