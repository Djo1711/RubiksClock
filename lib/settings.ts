import { getSafeStorage, safeSetItem } from '@/lib/storage/safe-storage'
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

/**
 * One, two or three keys per hand. The count is even so the map always splits
 * evenly between the two hands, which is how KeyHints and TouchPads divide it.
 * Six is kept because that was the only count earlier versions stored, but most
 * keyboards cannot report six simultaneous presses (matrix ghosting), so
 * smaller maps have to be accepted too.
 */
const VALID_KEY_COUNTS: ReadonlySet<number> = new Set([2, 4, 6])

function isValidKeyMap(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    VALID_KEY_COUNTS.has(value.length) &&
    value.every((key) => typeof key === 'string' && key.length > 0) &&
    new Set(value).size === value.length
  )
}

export function loadSettings(storage: Storage | null = getSafeStorage()): Settings {
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

/** Dispatched on this tab after saveSettings writes to localStorage, so the
 * store subscription can react to same-tab changes (the native `storage`
 * event only fires in other tabs). Mirrors i18n-provider's locale store. */
export const SETTINGS_CHANGE_EVENT = 'rubiksclock:settings-change'

// useSyncExternalStore's getSnapshot must return a referentially stable
// value across calls when nothing changed, or React re-renders forever.
// loadSettings() builds a fresh object every call, so the store caches the
// last parsed value and only recomputes after a change is observed.
let cachedSettings: Settings | null = null

export function getSettingsSnapshot(): Settings {
  cachedSettings ??= loadSettings()
  return cachedSettings
}

// The server always renders the defaults, so the first client render must
// agree — otherwise hydration mismatches on settings-derived markup.
export function getServerSettingsSnapshot(): Settings {
  return defaultSettings
}

export function subscribeSettings(listener: () => void): () => void {
  const onChange = () => {
    cachedSettings = null
    listener()
  }
  window.addEventListener('storage', onChange)
  window.addEventListener(SETTINGS_CHANGE_EVENT, onChange)
  return () => {
    window.removeEventListener('storage', onChange)
    window.removeEventListener(SETTINGS_CHANGE_EVENT, onChange)
  }
}

export function saveSettings(
  settings: Settings,
  storage: Storage | null = getSafeStorage(),
): void {
  safeSetItem(storage, SETTINGS_STORAGE_KEY, JSON.stringify(settings))
  cachedSettings = settings
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(SETTINGS_CHANGE_EVENT))
  }
}
