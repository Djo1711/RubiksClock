'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import {
  dictionaries,
  isLocale,
  LOCALE_STORAGE_KEY,
  type Dictionary,
  type Locale,
} from '@/lib/i18n/dictionaries'

type I18nValue = {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: Dictionary
}

const I18nContext = createContext<I18nValue | null>(null)

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('fr')

  // Resolve the stored or browser locale after mount, so the server-rendered
  // markup and the first client render agree.
  useEffect(() => {
    const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY)
    if (isLocale(stored)) {
      setLocaleState(stored)
      return
    }
    setLocaleState(navigator.language.toLowerCase().startsWith('fr') ? 'fr' : 'en')
  }, [])

  useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])

  const setLocale = useCallback((next: Locale) => {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, next)
    setLocaleState(next)
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
