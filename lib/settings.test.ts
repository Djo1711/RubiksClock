import { beforeEach, describe, expect, it } from 'vitest'
import { defaultSettings, loadSettings, saveSettings, SETTINGS_STORAGE_KEY } from './settings'

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
