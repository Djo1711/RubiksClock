'use client'

import {
  inspectionElapsedMs,
  isArmed,
  type TimerConfig,
  type TimerState,
} from '@/lib/timer/machine'
import { INSPECTION_MS, INSPECTION_PLUS2_LIMIT_MS } from '@/lib/timer/penalties'

export type TimerPhase =
  | 'idle'
  | 'arming'
  | 'ready'
  | 'inspection'
  | 'inspectionPlus2'
  | 'inspectionDnf'
  | 'running'
  | 'stopped'

/** The single source of truth for what the screen looks like right now. */
export function timerPhase(
  state: TimerState,
  now: number,
  armed: boolean,
  config: TimerConfig,
): TimerPhase {
  switch (state.status) {
    case 'idle':
      return 'idle'
    case 'stopped':
      return 'stopped'
    case 'running':
      return 'running'
    case 'armingInspection':
    case 'armingSolve':
      return armed || isArmed(state, now, config) ? 'ready' : 'arming'
    case 'inspection': {
      const elapsed = inspectionElapsedMs(state, now)
      if (elapsed > INSPECTION_PLUS2_LIMIT_MS) return 'inspectionDnf'
      if (elapsed > INSPECTION_MS) return 'inspectionPlus2'
      return 'inspection'
    }
  }
}

const PHASE_COLOR: Record<TimerPhase, string> = {
  idle: 'text-(--color-state-idle)',
  arming: 'text-(--color-state-arming)',
  ready: 'text-(--color-state-ready)',
  inspection: 'text-(--color-state-inspection)',
  inspectionPlus2: 'text-(--color-state-warn)',
  inspectionDnf: 'text-(--color-state-danger)',
  running: 'text-(--color-state-idle)',
  stopped: 'text-(--color-state-idle)',
}

export function TimerDisplay({
  phase,
  value,
  hint,
}: {
  phase: TimerPhase
  value: string
  hint: string
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-col items-center gap-4 select-none"
    >
      <span
        className={`font-mono text-[clamp(4.5rem,min(18vw,20svh),11rem)] leading-none tabular-nums transition-colors duration-150 ${PHASE_COLOR[phase]}`}
      >
        {value}
      </span>
      <span className="text-sm tracking-wide text-neutral-400 uppercase">{hint}</span>
    </div>
  )
}
