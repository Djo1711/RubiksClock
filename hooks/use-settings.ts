'use client'

import { useCallback, useSyncExternalStore } from 'react'
import {
  getServerSettingsSnapshot,
  getSettingsSnapshot,
  saveSettings,
  subscribeSettings,
  type Settings,
} from '@/lib/settings'

export function useSettings(): {
  settings: Settings
  updateSettings: (next: Settings) => void
} {
  const settings = useSyncExternalStore(
    subscribeSettings,
    getSettingsSnapshot,
    getServerSettingsSnapshot,
  )

  const updateSettings = useCallback((next: Settings) => {
    saveSettings(next)
  }, [])

  return { settings, updateSettings }
}
