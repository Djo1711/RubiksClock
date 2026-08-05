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

  // One key per hand is enough to commit both hands, and few keyboards can
  // report six presses at once, so 2, 4 and 6 keys are all legitimate maps.
  it.each([
    ['one key per hand', ['KeyF', 'KeyJ']],
    ['two keys per hand', ['KeyD', 'KeyF', 'KeyJ', 'KeyK']],
    ['three keys per hand', ['KeyS', 'KeyD', 'KeyF', 'KeyJ', 'KeyK', 'KeyL']],
  ])('loads a stored map of %s unchanged', (_label, keys) => {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({ ...defaultSettings, keys }))
    expect(loadSettings().keys).toEqual(keys)
  })

  // The six-key map every existing install stored before the count became
  // configurable: still a valid count, so it must survive the upgrade.
  it('keeps a previously stored six-key map', () => {
    const stored = ['KeyQ', 'KeyZ', 'KeyD', 'KeyL', 'KeyI', 'KeyJ']
    localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({ ...defaultSettings, keys: stored }),
    )
    expect(loadSettings().keys).toEqual(stored)
  })

  it.each([
    ['a duplicate', ['KeyF', 'KeyF']],
    ['an odd count', ['KeyD', 'KeyF', 'KeyJ']],
    ['a single key, which cannot split across two hands', ['KeyF']],
    ['no key at all', []],
    [
      'more keys than any hand pairing',
      ['KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyJ', 'KeyK', 'KeyL', 'KeyM'],
    ],
    ['a non-string entry', ['KeyF', 42]],
    ['an empty code', ['KeyF', '']],
    ['not an array at all', 'KeyF'],
  ])('falls back to the defaults on a key map with %s', (_label, keys) => {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({ ...defaultSettings, keys }))
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
