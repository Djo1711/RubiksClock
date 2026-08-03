import { DEFAULT_KEYS } from '@/lib/timer/machine'

export const SETTINGS_STORAGE_KEY = 'rubiksclock.settings.v1'

export type Settings = {
  keys: string[]
  hideTimeWhileSolving: boolean
  sounds: boolean
}

export const defaultSettings: Settings = {
  keys: [...DEFAULT_KEYS],
  hideTimeWhileSolving: false,
  sounds: true,
}

function isValidKeyMap(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.length === DEFAULT_KEYS.length &&
    value.every((key) => typeof key === 'string' && key.length > 0) &&
    new Set(value).size === value.length
  )
}

function defaultStorage(): Storage | null {
  return typeof window === 'undefined' ? null : window.localStorage
}

export function loadSettings(storage: Storage | null = defaultStorage()): Settings {
  const raw = storage?.getItem(SETTINGS_STORAGE_KEY)
  if (!raw) return defaultSettings
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return defaultSettings
  }
  if (typeof parsed !== 'object' || parsed === null) return defaultSettings
  const candidate = parsed as Partial<Settings>
  return {
    keys: isValidKeyMap(candidate.keys) ? candidate.keys : defaultSettings.keys,
    hideTimeWhileSolving:
      typeof candidate.hideTimeWhileSolving === 'boolean'
        ? candidate.hideTimeWhileSolving
        : defaultSettings.hideTimeWhileSolving,
    sounds: typeof candidate.sounds === 'boolean' ? candidate.sounds : defaultSettings.sounds,
  }
}

export function saveSettings(
  settings: Settings,
  storage: Storage | null = defaultStorage(),
): void {
  storage?.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings))
}
