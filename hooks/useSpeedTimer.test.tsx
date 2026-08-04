import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { DEFAULT_KEYS, HOLD_MS } from '@/lib/timer/machine'
import { useSpeedTimer } from './useSpeedTimer'

function setup() {
  let clock = 0
  const now = () => clock
  const onSolveComplete = vi.fn()
  const view = renderHook(() => useSpeedTimer({ now, onSolveComplete }))
  const advance = (ms: number) => {
    clock += ms
  }
  const keyDown = (code: string) =>
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { code, bubbles: true }))
    })
  const keyUp = (code: string) =>
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keyup', { code, bubbles: true }))
    })
  const holdAll = () => DEFAULT_KEYS.forEach(keyDown)
  return { view, advance, keyDown, keyUp, holdAll, onSolveComplete }
}

describe('useSpeedTimer', () => {
  it('arms on the six keys and starts the inspection on release', () => {
    const { view, advance, holdAll, keyUp } = setup()
    holdAll()
    expect(view.result.current.state.status).toBe('armingInspection')
    expect(view.result.current.armed).toBe(false)
    advance(HOLD_MS)
    keyUp(DEFAULT_KEYS[0])
    expect(view.result.current.state.status).toBe('inspection')
  })

  it('starts the solve, then stops it on space and reports the result', () => {
    const { view, advance, holdAll, keyUp, onSolveComplete } = setup()
    holdAll()
    advance(HOLD_MS)
    keyUp(DEFAULT_KEYS[0])
    advance(9_000)
    holdAll()
    advance(HOLD_MS)
    keyUp(DEFAULT_KEYS[0])
    expect(view.result.current.state.status).toBe('running')
    advance(12_340)
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', bubbles: true }))
    })
    expect(view.result.current.state.status).toBe('stopped')
    expect(onSolveComplete).toHaveBeenCalledWith({
      rawMs: 12_340,
      inspectionMs: 9_000 + HOLD_MS,
      penalty: 'none',
    })
  })

  it('aborts on escape', () => {
    const { view, holdAll } = setup()
    holdAll()
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape', bubbles: true }))
    })
    expect(view.result.current.state.status).toBe('idle')
  })

  it('aborts when the window loses focus', () => {
    const { view, holdAll } = setup()
    holdAll()
    act(() => {
      window.dispatchEvent(new Event('blur'))
    })
    expect(view.result.current.state.status).toBe('idle')
  })

  it('ignores key repeats', () => {
    const { view } = setup()
    act(() => {
      window.dispatchEvent(
        new KeyboardEvent('keydown', { code: DEFAULT_KEYS[0], repeat: true, bubbles: true }),
      )
    })
    expect(view.result.current.state.heldKeys).toEqual([])
  })

  it('ignores keys typed into a text field', () => {
    const input = document.createElement('input')
    document.body.append(input)
    const { view } = setup()
    act(() => {
      input.dispatchEvent(
        new KeyboardEvent('keydown', { code: DEFAULT_KEYS[0], bubbles: true }),
      )
    })
    expect(view.result.current.state.heldKeys).toEqual([])
    input.remove()
  })

  it('ignores keys pressed inside a [data-timer-ignore] subtree', () => {
    const panel = document.createElement('div')
    panel.setAttribute('data-timer-ignore', '')
    const button = document.createElement('button')
    panel.append(button)
    document.body.append(panel)
    const { view } = setup()
    act(() => {
      button.dispatchEvent(
        new KeyboardEvent('keydown', { code: DEFAULT_KEYS[0], bubbles: true }),
      )
    })
    expect(view.result.current.state.heldKeys).toEqual([])
    panel.remove()
  })

  it('drives the machine from the touch pad helpers', () => {
    const { view, advance } = setup()
    act(() => {
      DEFAULT_KEYS.forEach((code) => view.result.current.press(code))
    })
    expect(view.result.current.state.status).toBe('armingInspection')
    advance(HOLD_MS)
    act(() => {
      view.result.current.release(DEFAULT_KEYS[0])
    })
    expect(view.result.current.state.status).toBe('inspection')
  })

  it('stops a running timer from the touch pad stop helper', () => {
    const { view, advance, holdAll, keyUp, onSolveComplete } = setup()
    holdAll()
    advance(HOLD_MS)
    keyUp(DEFAULT_KEYS[0])
    advance(9_000)
    holdAll()
    advance(HOLD_MS)
    keyUp(DEFAULT_KEYS[0])
    expect(view.result.current.state.status).toBe('running')
    advance(12_340)
    act(() => {
      view.result.current.stop()
    })
    expect(view.result.current.state.status).toBe('stopped')
    expect(onSolveComplete).toHaveBeenCalledWith({
      rawMs: 12_340,
      inspectionMs: 9_000 + HOLD_MS,
      penalty: 'none',
    })
  })

  it('publishes a fresh now from the animation frame loop while counting', async () => {
    const { view, advance, holdAll } = setup()
    holdAll()
    expect(view.result.current.now).toBe(0)
    expect(view.result.current.armed).toBe(false)
    advance(HOLD_MS)
    // Two frames: the loop's own callback runs before one scheduled here.
    await act(async () => {
      await new Promise((resolve) => requestAnimationFrame(() => resolve(null)))
      await new Promise((resolve) => requestAnimationFrame(() => resolve(null)))
    })
    expect(view.result.current.now).toBe(HOLD_MS)
    expect(view.result.current.armed).toBe(true)
  })

  it('does not schedule animation frames while idle', () => {
    const scheduled = vi.spyOn(globalThis, 'requestAnimationFrame')
    setup()
    expect(scheduled).not.toHaveBeenCalled()
    scheduled.mockRestore()
  })
})
