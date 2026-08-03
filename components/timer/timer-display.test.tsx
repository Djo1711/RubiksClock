import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { defaultConfig, initialState, type TimerState } from '@/lib/timer/machine'
import { TimerDisplay, timerPhase } from './timer-display'

const at = (state: Partial<TimerState>): TimerState => ({ ...initialState, ...state })

describe('timerPhase', () => {
  it('is idle at rest', () => {
    expect(timerPhase(initialState, 0, false, defaultConfig)).toBe('idle')
  })

  it('is arming while the hold is too short, then ready', () => {
    const state = at({ status: 'armingInspection', armedAt: 0 })
    expect(timerPhase(state, 100, false, defaultConfig)).toBe('arming')
    expect(timerPhase(state, 600, true, defaultConfig)).toBe('ready')
  })

  it('escalates the inspection through +2 and DNF', () => {
    const state = at({ status: 'inspection', inspectionStartedAt: 0 })
    expect(timerPhase(state, 9_000, false, defaultConfig)).toBe('inspection')
    expect(timerPhase(state, 15_500, false, defaultConfig)).toBe('inspectionPlus2')
    expect(timerPhase(state, 17_500, false, defaultConfig)).toBe('inspectionDnf')
  })
})

describe('TimerDisplay', () => {
  it('renders the value and the hint, and announces changes politely', () => {
    render(<TimerDisplay phase="inspection" value="12" hint="Inspection" />)
    expect(screen.getByText('12')).not.toBeNull()
    expect(screen.getByText('Inspection')).not.toBeNull()
    expect(screen.getByRole('status')).not.toBeNull()
  })
})
