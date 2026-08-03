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
})
