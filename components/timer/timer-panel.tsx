'use client'

import { useEffect, useRef } from 'react'
import { useI18n } from '@/components/i18n-provider'
import { KeyHints } from '@/components/timer/key-hints'
import { TimerDisplay, timerPhase, type TimerPhase } from '@/components/timer/timer-display'
import { TouchPads } from '@/components/timer/touch-pads'
import { useSpeedTimer, type SolveResult } from '@/hooks/useSpeedTimer'
import { createBeeper } from '@/lib/audio'
import { formatCountdown, formatMs, formatResult } from '@/lib/format'
import { CUES, dueCues } from '@/lib/timer/cues'
import {
  defaultConfig,
  inspectionElapsedMs,
  inspectionRemainingMs,
  solveElapsedMs,
  type TimerConfig,
} from '@/lib/timer/machine'

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
    for (const threshold of dueCues(inspectionElapsed, fired.current)) {
      fired.current.add(threshold)
      if (!sounds) continue
      beeper.current ??= createBeeper()
      beeper.current.beep(CUES.indexOf(threshold) + 1)
    }
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
    <section className="flex w-full flex-col items-center gap-6">
      <TimerDisplay phase={phase} value={value} hint={hint[phase]} />
      {/* The row keeps its height whether or not the cue markers are in it, so
        * the numerals never move when inspection starts. */}
      <div className="flex h-2 gap-2" aria-hidden="true">
        {inspecting ? (
          <>
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
          </>
        ) : null}
      </div>
      <KeyHints keys={config.keys} held={state.heldKeys} />
      <TouchPads keys={config.keys} onPress={press} onRelease={release} />
    </section>
  )
}
