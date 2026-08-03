import { beforeEach, describe, expect, it } from 'vitest'
import {
  defaultSettings,
  getSettingsSnapshot,
  loadSettings,
  saveSettings,
  SETTINGS_STORAGE_KEY,
} from './settings'

describe('settings', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('returns the defaults when nothing is stored', () => {
    expect(loadSettings()).toEqual(defaultSettings)
  })

  it('round-trips saved settings', () => {
    const settings = { ...defaultSettings, sounds: false, hideTimeWhileSolving: true }
    saveSettings(settings)
    expect(loadSettings()).toEqual(settings)
  })

  it('falls back to the defaults on a corrupted payload', () => {
    localStorage.setItem(SETTINGS_STORAGE_KEY, '{oops')
    expect(loadSettings()).toEqual(defaultSettings)
  })

  it('rejects a key map that is not six distinct keys', () => {
    localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({ ...defaultSettings, keys: ['KeyQ', 'KeyQ'] }),
    )
    expect(loadSettings().keys).toEqual(defaultSettings.keys)
  })
})

describe('getSettingsSnapshot', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  // This is the property that prevents useSyncExternalStore from re-rendering
  // forever: loadSettings() builds a fresh object every call, so the
  // snapshot must be cached rather than recomputed on every read.
  it('returns the same object reference across consecutive calls when nothing changed', () => {
    const first = getSettingsSnapshot()
    const second = getSettingsSnapshot()
    expect(second).toBe(first)
  })

  it('reflects a saveSettings call immediately, without a fresh load', () => {
    const next = { ...defaultSettings, sounds: false }
    saveSettings(next)
    expect(getSettingsSnapshot()).toBe(next)
  })
})
