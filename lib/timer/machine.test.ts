import { describe, expect, it } from 'vitest'
import {
  DEFAULT_KEYS,
  HOLD_MS,
  defaultConfig,
  initialState,
  inspectionRemainingMs,
  isArmed,
  reduce,
  solveElapsedMs,
  type TimerEvent,
  type TimerState,
} from './machine'

const [L1, L2, , R1] = DEFAULT_KEYS

const down = (code: string, at: number): TimerEvent => ({ type: 'keyDown', code, at })
const up = (code: string, at: number): TimerEvent => ({ type: 'keyUp', code, at })
const allDown = (at: number): TimerEvent[] => DEFAULT_KEYS.map((code) => down(code, at))

function feed(events: TimerEvent[], from: TimerState = initialState): TimerState {
  return events.reduce((state, event) => reduce(state, event, defaultConfig), from)
}

/** All six keys held at t=0, released at t=HOLD_MS: inspection starts. */
function intoInspection(): TimerState {
  return feed([...allDown(0), up(L1, HOLD_MS)])
}

/**
 * Inspection starts at t=HOLD_MS. Arming at t=inspectionMs and releasing one
 * hold delay later starts the solve exactly `inspectionMs` into the inspection.
 */
function intoRunning(inspectionMs: number): TimerState {
  const armAt = inspectionMs
  return feed([...allDown(armAt), up(L1, armAt + HOLD_MS)], intoInspection())
}

describe('idle', () => {
  it('accumulates held keys without arming', () => {
    const state = feed([down(L1, 0), down(L2, 10)])
    expect(state.status).toBe('idle')
    expect(state.heldKeys).toEqual([L1, L2])
  })

  it('ignores a repeated keyDown for a key already held', () => {
    const state = feed([down(L1, 0), down(L1, 5)])
    expect(state.heldKeys).toEqual([L1])
  })

  it('ignores keys outside the configured six', () => {
    const state = feed([down('KeyX', 0)])
    expect(state.heldKeys).toEqual([])
  })

  it('arms once all six keys are held', () => {
    const state = feed(allDown(0))
    expect(state.status).toBe('armingInspection')
    expect(state.armedAt).toBe(0)
  })

  it('forgets a released key', () => {
    const state = feed([down(L1, 0), up(L1, 5)])
    expect(state.heldKeys).toEqual([])
  })
})

describe('armingInspection', () => {
  it('is not armed before the hold delay and is armed after it', () => {
    const state = feed(allDown(0))
    expect(isArmed(state, HOLD_MS - 1, defaultConfig)).toBe(false)
    expect(isArmed(state, HOLD_MS, defaultConfig)).toBe(true)
  })

  it('returns to idle when a key is released too early', () => {
    const state = feed([...allDown(0), up(L1, HOLD_MS - 1)])
    expect(state.status).toBe('idle')
    expect(state.armedAt).toBeNull()
  })

  it('starts the inspection on the first release once armed', () => {
    const state = intoInspection()
    expect(state.status).toBe('inspection')
    expect(state.inspectionStartedAt).toBe(HOLD_MS)
  })

  it('counts the inspection down from 15 seconds', () => {
    const state = intoInspection()
    expect(inspectionRemainingMs(state, HOLD_MS, defaultConfig)).toBe(15_000)
    expect(inspectionRemainingMs(state, HOLD_MS + 6_000, defaultConfig)).toBe(9_000)
    expect(inspectionRemainingMs(state, HOLD_MS + 16_000, defaultConfig)).toBe(-1_000)
  })
})

describe('inspection', () => {
  it('arms the solve once all six keys are held again', () => {
    const state = feed(allDown(5_000), intoInspection())
    expect(state.status).toBe('armingSolve')
    expect(state.armedAt).toBe(5_000)
  })

  it('ignores space', () => {
    const state = feed([{ type: 'stop', at: 5_000 }], intoInspection())
    expect(state.status).toBe('inspection')
  })
})

describe('armingSolve', () => {
  it('returns to inspection when released too early, without pausing the inspection clock', () => {
    const state = feed([...allDown(5_000), up(L1, 5_000 + HOLD_MS - 1)], intoInspection())
    expect(state.status).toBe('inspection')
    expect(state.inspectionStartedAt).toBe(HOLD_MS)
    expect(state.armedAt).toBeNull()
  })

  it('starts the solve on the first release once armed', () => {
    const state = feed([...allDown(5_000), up(L1, 5_000 + HOLD_MS)], intoInspection())
    expect(state.status).toBe('running')
    expect(state.solveStartedAt).toBe(5_000 + HOLD_MS)
  })

  it('freezes the inspection time and its penalty at the moment the solve starts', () => {
    const state = intoRunning(9_000)
    expect(state.inspectionMs).toBe(9_000)
    expect(state.penalty).toBe('none')
  })

  it('awards +2 when the solve starts past 15 seconds of inspection', () => {
    expect(intoRunning(15_500).penalty).toBe('plus2')
  })

  it('awards a DNF when the solve starts past 17 seconds of inspection', () => {
    expect(intoRunning(17_500).penalty).toBe('dnf')
  })
})

describe('running', () => {
  it('reports the elapsed solve time', () => {
    const state = intoRunning(9_000)
    expect(solveElapsedMs(state, state.solveStartedAt! + 12_340)).toBe(12_340)
  })

  it('records the raw time when space stops it', () => {
    const running = intoRunning(9_000)
    const state = reduce(
      running,
      { type: 'stop', at: running.solveStartedAt! + 12_340 },
      defaultConfig,
    )
    expect(state.status).toBe('stopped')
    expect(state.rawMs).toBe(12_340)
  })

  it('ignores the six keys so a solve cannot be re-armed mid-attempt', () => {
    const running = intoRunning(9_000)
    const state = feed(allDown(running.solveStartedAt! + 1_000), running)
    expect(state.status).toBe('running')
    expect(state.heldKeys).toEqual([])
  })

  it('ignores the keyUp of the key whose release started the solve', () => {
    const running = intoRunning(9_000)
    const state = feed([up(R1, running.solveStartedAt! + 20)], running)
    expect(state.status).toBe('running')
  })
})

describe('stopped', () => {
  it('starts the next attempt when the six keys are held again, clearing the result', () => {
    const running = intoRunning(9_000)
    const stopped = reduce(
      running,
      { type: 'stop', at: running.solveStartedAt! + 12_340 },
      defaultConfig,
    )
    const state = feed(allDown(100_000), stopped)
    expect(state.status).toBe('armingInspection')
    expect(state.rawMs).toBeNull()
    expect(state.inspectionMs).toBeNull()
    expect(state.penalty).toBe('none')
  })
})

describe('abort', () => {
  it('returns any state to the initial state', () => {
    for (const state of [
      feed(allDown(0)),
      intoInspection(),
      feed(allDown(5_000), intoInspection()),
      intoRunning(9_000),
    ]) {
      expect(reduce(state, { type: 'abort' }, defaultConfig)).toEqual(initialState)
    }
  })
})

describe('custom key maps', () => {
  it('arms on the configured keys only', () => {
    const config = { ...defaultConfig, keys: ['KeyA', 'KeyB'] as const }
    const state = [
      { type: 'keyDown', code: 'KeyA', at: 0 } as const,
      { type: 'keyDown', code: 'KeyB', at: 0 } as const,
    ].reduce((s, e) => reduce(s, e, config), initialState)
    expect(state.status).toBe('armingInspection')
  })
})
