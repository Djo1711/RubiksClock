'use client'

import { useI18n } from '@/components/i18n-provider'
import { KeyHints } from '@/components/timer/key-hints'
import { TimerDisplay, timerPhase, type TimerPhase } from '@/components/timer/timer-display'
import { TouchPads } from '@/components/timer/touch-pads'
import { useSpeedTimer, type SolveResult } from '@/hooks/useSpeedTimer'
import { formatCountdown, formatMs, formatResult } from '@/lib/format'
import {
  defaultConfig,
  inspectionRemainingMs,
  solveElapsedMs,
  type TimerConfig,
} from '@/lib/timer/machine'

export function TimerPanel({
  config = defaultConfig,
  hideTimeWhileSolving = false,
  onSolveComplete,
}: {
  config?: TimerConfig
  hideTimeWhileSolving?: boolean
  onSolveComplete?: (result: SolveResult) => void
}) {
  const { t } = useI18n()
  const { state, now, armed, press, release } = useSpeedTimer({ config, onSolveComplete })
  const phase = timerPhase(state, now, armed, config)

  const value = (() => {
    switch (phase) {
      case 'idle':
      case 'arming':
      case 'ready':
        return state.status === 'armingSolve'
          ? formatCountdown(inspectionRemainingMs(state, now, config))
          : '0.00'
      case 'inspection':
      case 'inspectionPlus2':
      case 'inspectionDnf':
        return formatCountdown(inspectionRemainingMs(state, now, config))
      case 'running':
        return hideTimeWhileSolving ? '•••' : formatMs(solveElapsedMs(state, now))
      case 'stopped':
        return state.rawMs === null ? '0.00' : formatResult(state.rawMs, state.penalty)
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
      <KeyHints keys={config.keys} held={state.heldKeys} />
      <TouchPads keys={config.keys} onPress={press} onRelease={release} />
    </section>
  )
}
