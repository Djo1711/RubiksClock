'use client'

import { useEffect, useRef } from 'react'
import { useI18n } from '@/components/i18n-provider'
import { KeyHints } from '@/components/timer/key-hints'
import { TimerDisplay, timerPhase, type TimerPhase } from '@/components/timer/timer-display'
import { TouchPads } from '@/components/timer/touch-pads'
import { useSpeedTimer, type SolveResult } from '@/hooks/useSpeedTimer'
import { createBeeper } from '@/lib/audio'
import { formatCountdown, formatMs, formatResult } from '@/lib/format'
import {
  defaultConfig,
  inspectionElapsedMs,
  inspectionRemainingMs,
  solveElapsedMs,
  type TimerConfig,
} from '@/lib/timer/machine'

/** WCA A3b1 and A3b2: the judge warns at 8 and at 12 seconds. */
const CUES = [8_000, 12_000] as const

export function TimerPanel({
  config = defaultConfig,
  hideTimeWhileSolving = false,
  sounds = false,
  onSolveComplete,
}: {
  config?: TimerConfig
  hideTimeWhileSolving?: boolean
  sounds?: boolean
  onSolveComplete?: (result: SolveResult) => void
}) {
  const { t } = useI18n()
  const { state, now, armed, press, release } = useSpeedTimer({ config, onSolveComplete })
  const phase = timerPhase(state, now, armed, config)

  const inspecting = state.status === 'inspection' || state.status === 'armingSolve'
  const inspectionElapsed = inspecting ? inspectionElapsedMs(state, now) : 0

  const beeper = useRef<ReturnType<typeof createBeeper> | null>(null)
  const fired = useRef<Set<number>>(new Set())

  useEffect(() => {
    if (!inspecting) {
      fired.current.clear()
      return
    }
    CUES.forEach((threshold, index) => {
      if (inspectionElapsed < threshold || fired.current.has(threshold)) return
      fired.current.add(threshold)
      if (!sounds) return
      beeper.current ??= createBeeper()
      beeper.current.beep(index + 1)
    })
  }, [inspecting, inspectionElapsed, sounds])

  const value = (() => {
    switch (phase) {
      case 'inspection':
      case 'inspectionPlus2':
      case 'inspectionDnf':
        return formatCountdown(inspectionRemainingMs(state, now, config))
      case 'arming':
      case 'ready':
        return state.status === 'armingSolve'
          ? formatCountdown(inspectionRemainingMs(state, now, config))
          : '0.00'
      case 'running':
        return hideTimeWhileSolving ? '•••' : formatMs(solveElapsedMs(state, now))
      case 'stopped':
        return state.rawMs === null ? '0.00' : formatResult(state.rawMs, state.penalty)
      case 'idle':
        return '0.00'
    }
  })()

  const hint: Record<TimerPhase, string> = {
    idle: t.idleHint,
    arming: t.armingHint,
    ready: state.status === 'armingSolve' ? t.releaseHint : t.readyHint,
    inspection: t.inspectionLabel,
    inspectionPlus2: t.plus2Warning,
    inspectionDnf: t.dnfWarning,
    running: t.runningHint,
    stopped: t.stoppedHint,
  }

  return (
    <section className="flex flex-col items-center gap-8">
      <TimerDisplay phase={phase} value={value} hint={hint[phase]} />
      {inspecting ? (
        <div className="flex gap-2" aria-hidden="true">
          <span
            className={`h-2 w-8 rounded-full transition-colors ${
              inspectionElapsed >= CUES[0] ? 'bg-(--color-state-warn)' : 'bg-neutral-800'
            }`}
          />
          <span
            className={`h-2 w-8 rounded-full transition-colors ${
              inspectionElapsed >= CUES[1] ? 'bg-(--color-state-danger)' : 'bg-neutral-800'
            }`}
          />
        </div>
      ) : null}
      <KeyHints keys={config.keys} held={state.heldKeys} />
      <TouchPads keys={config.keys} onPress={press} onRelease={release} />
    </section>
  )
}
