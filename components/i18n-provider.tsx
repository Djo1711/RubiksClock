'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from 'react'
import {
  dictionaries,
  isLocale,
  LOCALE_STORAGE_KEY,
  type Dictionary,
  type Locale,
} from '@/lib/i18n/dictionaries'
import { getSafeStorage, safeSetItem } from '@/lib/storage/safe-storage'

type I18nValue = {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: Dictionary
}

const I18nContext = createContext<I18nValue | null>(null)

/** Dispatched on this tab after setLocale writes to localStorage, so the
 * store subscription can react to same-tab changes (the native `storage`
 * event only fires in other tabs). */
const LOCALE_CHANGE_EVENT = 'rubiksclock:locale-change'

function getSnapshot(): Locale {
  const stored = getSafeStorage()?.getItem(LOCALE_STORAGE_KEY) ?? null
  if (isLocale(stored)) return stored
  return navigator.language.toLowerCase().startsWith('fr') ? 'fr' : 'en'
}

// The server always renders 'fr', so the first client render must agree —
// otherwise hydration mismatches on the locale-derived markup.
function getServerSnapshot(): Locale {
  return 'fr'
}

function subscribe(onStoreChange: () => void) {
  window.addEventListener('storage', onStoreChange)
  window.addEventListener(LOCALE_CHANGE_EVENT, onStoreChange)
  return () => {
    window.removeEventListener('storage', onStoreChange)
    window.removeEventListener(LOCALE_CHANGE_EVENT, onStoreChange)
  }
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const locale = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])

  const setLocale = useCallback((next: Locale) => {
    safeSetItem(getSafeStorage(), LOCALE_STORAGE_KEY, next)
    window.dispatchEvent(new Event(LOCALE_CHANGE_EVENT))
  }, [])

  const value = useMemo<I18nValue>(
    () => ({ locale, setLocale, t: dictionaries[locale] }),
    [locale, setLocale],
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nValue {
  const value = useContext(I18nContext)
  if (!value) throw new Error('useI18n must be used inside <I18nProvider>')
  return value
}
