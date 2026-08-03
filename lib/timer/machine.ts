import { INSPECTION_MS, inspectionPenalty, type Penalty } from './penalties'

/** Mirrors the Stackmat's green-light delay. */
export const HOLD_MS = 550

/**
 * Physical key positions, not characters: these are the AZERTY home-row and
 * upper-row keys under each hand, and the same positions on a QWERTY board.
 */
export const DEFAULT_KEYS = ['KeyQ', 'KeyZ', 'KeyD', 'KeyL', 'KeyI', 'KeyJ'] as const

export type TimerStatus =
  | 'idle'
  | 'armingInspection'
  | 'inspection'
  | 'armingSolve'
  | 'running'
  | 'stopped'

export type TimerState = {
  status: TimerStatus
  /** Configured keys currently held, in the order they were pressed. */
  heldKeys: readonly string[]
  /** When every configured key became held, in either arming state. */
  armedAt: number | null
  inspectionStartedAt: number | null
  solveStartedAt: number | null
  /** Inspection elapsed at the instant the solve started. */
  inspectionMs: number | null
  /** Measured solve time, set when the timer stops. */
  rawMs: number | null
  penalty: Penalty
}

export type TimerEvent =
  | { type: 'keyDown'; code: string; at: number }
  | { type: 'keyUp'; code: string; at: number }
  /** Space. */
  | { type: 'stop'; at: number }
  /** Escape, window blur, or tab hidden. */
  | { type: 'abort' }

export type TimerConfig = {
  keys: readonly string[]
  holdMs: number
  inspectionMs: number
}

export const defaultConfig: TimerConfig = {
  keys: DEFAULT_KEYS,
  holdMs: HOLD_MS,
  inspectionMs: INSPECTION_MS,
}

export const initialState: TimerState = {
  status: 'idle',
  heldKeys: [],
  armedAt: null,
  inspectionStartedAt: null,
  solveStartedAt: null,
  inspectionMs: null,
  rawMs: null,
  penalty: 'none',
}

/** True once the hold has lasted long enough to show the green light. */
export function isArmed(state: TimerState, now: number, config: TimerConfig): boolean {
  if (state.armedAt === null) return false
  return now - state.armedAt >= config.holdMs
}

export function inspectionElapsedMs(state: TimerState, now: number): number {
  if (state.inspectionStartedAt === null) return 0
  return now - state.inspectionStartedAt
}

export function inspectionRemainingMs(
  state: TimerState,
  now: number,
  config: TimerConfig,
): number {
  return config.inspectionMs - inspectionElapsedMs(state, now)
}

export function solveElapsedMs(state: TimerState, now: number): number {
  if (state.solveStartedAt === null) return 0
  return now - state.solveStartedAt
}

function withKeyDown(state: TimerState, code: string, config: TimerConfig): TimerState {
  if (!config.keys.includes(code) || state.heldKeys.includes(code)) return state
  const heldKeys = [...state.heldKeys, code]
  if (heldKeys.length < config.keys.length) return { ...state, heldKeys }
  return {
    ...state,
    heldKeys,
    status: state.status === 'inspection' ? 'armingSolve' : 'armingInspection',
    armedAt: null,
  }
}

export function reduce(
  state: TimerState,
  event: TimerEvent,
  config: TimerConfig,
): TimerState {
  if (event.type === 'abort') return initialState

  switch (state.status) {
    case 'idle':
    case 'stopped': {
      if (event.type !== 'keyDown') {
        if (event.type === 'keyUp') {
          return { ...state, heldKeys: state.heldKeys.filter((key) => key !== event.code) }
        }
        return state
      }
      const next = withKeyDown(state, event.code, config)
      if (next.status !== 'armingInspection') return next
      // A new attempt begins: clear the previous result.
      return {
        ...initialState,
        status: 'armingInspection',
        heldKeys: next.heldKeys,
        armedAt: event.at,
      }
    }

    case 'armingInspection': {
      if (event.type !== 'keyUp') return state
      if (!isArmed(state, event.at, config)) {
        return {
          ...state,
          status: 'idle',
          heldKeys: state.heldKeys.filter((key) => key !== event.code),
          armedAt: null,
        }
      }
      return {
        ...state,
        status: 'inspection',
        heldKeys: [],
        armedAt: null,
        inspectionStartedAt: event.at,
      }
    }

    case 'inspection': {
      if (event.type === 'keyDown') {
        const next = withKeyDown(state, event.code, config)
        return next.status === 'armingSolve' ? { ...next, armedAt: event.at } : next
      }
      if (event.type === 'keyUp') {
        return { ...state, heldKeys: state.heldKeys.filter((key) => key !== event.code) }
      }
      return state
    }

    case 'armingSolve': {
      if (event.type !== 'keyUp') return state
      if (!isArmed(state, event.at, config)) {
        return {
          ...state,
          status: 'inspection',
          heldKeys: state.heldKeys.filter((key) => key !== event.code),
          armedAt: null,
        }
      }
      const inspectionMs = inspectionElapsedMs(state, event.at)
      return {
        ...state,
        status: 'running',
        heldKeys: [],
        armedAt: null,
        solveStartedAt: event.at,
        inspectionMs,
        penalty: inspectionPenalty(inspectionMs),
      }
    }

    case 'running': {
      if (event.type !== 'stop') return state
      return { ...state, status: 'stopped', rawMs: solveElapsedMs(state, event.at) }
    }
  }
}
