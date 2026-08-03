import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { defaultSettings, saveSettings, SETTINGS_STORAGE_KEY } from '@/lib/settings'
import { useSettings } from './use-settings'

describe('useSettings', () => {
  afterEach(() => {
    window.localStorage.clear()
  })

  it('shows the stored settings on the first render, with no flash of defaults', () => {
    const stored = {
      ...defaultSettings,
      keys: ['KeyA', 'KeyZ', 'KeyD', 'KeyL', 'KeyI', 'KeyJ'],
      hideTimeWhileSolving: true,
    }
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(stored))

    const { result } = renderHook(() => useSettings())

    // useSyncExternalStore computes the initial snapshot synchronously, so
    // the very first render already reflects the stored value — unlike an
    // effect-based read, which would paint the defaults first and only
    // update afterwards.
    expect(result.current.settings).toEqual(stored)
  })

  it('persists via updateSettings and re-renders with the new value', () => {
    saveSettings(defaultSettings)
    const { result } = renderHook(() => useSettings())
    expect(result.current.settings).toEqual(defaultSettings)

    const next = { ...defaultSettings, sounds: false }
    act(() => {
      result.current.updateSettings(next)
    })

    expect(result.current.settings).toEqual(next)
    expect(JSON.parse(window.localStorage.getItem(SETTINGS_STORAGE_KEY) ?? 'null')).toEqual(next)
  })

  it('picks up a storage event from another tab', () => {
    saveSettings(defaultSettings)
    const { result } = renderHook(() => useSettings())
    expect(result.current.settings).toEqual(defaultSettings)

    const fromOtherTab = { ...defaultSettings, hideTimeWhileSolving: true }
    act(() => {
      window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(fromOtherTab))
      window.dispatchEvent(new StorageEvent('storage', { key: SETTINGS_STORAGE_KEY }))
    })

    expect(result.current.settings).toEqual(fromOtherTab)
  })
})
