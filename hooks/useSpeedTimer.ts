'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  defaultConfig,
  initialState,
  isArmed,
  reduce,
  type TimerConfig,
  type TimerEvent,
  type TimerState,
} from '@/lib/timer/machine'
import type { Penalty } from '@/lib/timer/penalties'

export type SolveResult = {
  rawMs: number
  inspectionMs: number
  penalty: Penalty
}

export type UseSpeedTimerOptions = {
  config?: TimerConfig
  /** Injectable clock; defaults to performance.now. */
  now?: () => number
  onSolveComplete?: (result: SolveResult) => void
}

const LIVE_STATUSES: ReadonlySet<TimerState['status']> = new Set([
  'armingInspection',
  'inspection',
  'armingSolve',
  'running',
])

/**
 * Keys typed into a field, or pressed while focus sits inside a panel marked
 * `data-timer-ignore` (settings dialog, solve list, navigation), belong to that
 * UI and must not drive the timer.
 */
function shouldIgnore(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable) return true
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return true
  return target.closest('[data-timer-ignore]') !== null
}

export function useSpeedTimer(options: UseSpeedTimerOptions = {}) {
  const config = options.config ?? defaultConfig
  const [state, setState] = useState<TimerState>(initialState)
  const [now, setNow] = useState(0)

  const configRef = useRef(config)
  configRef.current = config
  const nowRef = useRef(options.now)
  nowRef.current = options.now
  const onSolveCompleteRef = useRef(options.onSolveComplete)
  onSolveCompleteRef.current = options.onSolveComplete

  const clock = useCallback(() => (nowRef.current ?? performance.now)(), [])

  const dispatch = useCallback((event: TimerEvent) => {
    setState((current) => reduce(current, event, configRef.current))
  }, [])

  const press = useCallback(
    (code: string) => dispatch({ type: 'keyDown', code, at: clock() }),
    [clock, dispatch],
  )
  const release = useCallback(
    (code: string) => dispatch({ type: 'keyUp', code, at: clock() }),
    [clock, dispatch],
  )

  // Keyboard is the only input the machine cares about.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || shouldIgnore(event.target)) return
      if (event.code === 'Space') {
        event.preventDefault()
        dispatch({ type: 'stop', at: clock() })
        return
      }
      if (event.code === 'Escape') {
        dispatch({ type: 'abort' })
        return
      }
      if (!configRef.current.keys.includes(event.code)) return
      event.preventDefault()
      dispatch({ type: 'keyDown', code: event.code, at: clock() })
    }

    const onKeyUp = (event: KeyboardEvent) => {
      if (shouldIgnore(event.target)) return
      if (!configRef.current.keys.includes(event.code)) return
      event.preventDefault()
      dispatch({ type: 'keyUp', code: event.code, at: clock() })
    }

    // A hidden tab or an unfocused window cannot be trusted to deliver keyups,
    // so the attempt in progress is discarded rather than mistimed.
    const onAbort = () => dispatch({ type: 'abort' })
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') onAbort()
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', onAbort)
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', onAbort)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [clock, dispatch])

  // One rAF loop, running only while something is actually counting.
  useEffect(() => {
    if (!LIVE_STATUSES.has(state.status)) return
    let frame = 0
    const tick = () => {
      setNow(clock())
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [clock, state.status])

  useEffect(() => {
    if (state.status !== 'stopped') return
    if (state.rawMs === null || state.inspectionMs === null) return
    onSolveCompleteRef.current?.({
      rawMs: state.rawMs,
      inspectionMs: state.inspectionMs,
      penalty: state.penalty,
    })
  }, [state.inspectionMs, state.penalty, state.rawMs, state.status])

  return {
    state,
    // While counting, this is the frame loop's latest tick. Otherwise it is a
    // fresh clock read, so never combine it with solveElapsedMs after a stop —
    // read the frozen state.rawMs instead.
    now: LIVE_STATUSES.has(state.status) ? now : clock(),
    armed: isArmed(state, now, config),
    press,
    release,
  }
}
