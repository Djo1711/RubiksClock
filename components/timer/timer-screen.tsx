'use client'

import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import { useI18n } from '@/components/i18n-provider'
import { ScrambleBar } from '@/components/scramble/scramble-bar'
import { SessionStats } from '@/components/session/session-stats'
import { SolveList } from '@/components/session/solve-list'
import { SettingsDialog } from '@/components/settings/settings-dialog'
import { TimerPanel } from '@/components/timer/timer-panel'
import { useSession } from '@/hooks/use-session'
import { useSettings } from '@/hooks/use-settings'
import type { SolveResult } from '@/hooks/useSpeedTimer'
import { createCubingScrambleProvider } from '@/lib/scramble/cubing-provider'
import type { ScrambleProvider } from '@/lib/scramble/types'
import { HOLD_MS } from '@/lib/timer/machine'
import { INSPECTION_MS } from '@/lib/timer/penalties'

/** Lazily creates the provider once, on first render, instead of on every
 * render — safe even if the factory ever gains a side effect. Returns the
 * ref itself rather than `.current`: the instance is only ever read later,
 * outside of render, in effects and event handlers. */
function useScrambleProviderRef(): RefObject<ScrambleProvider | null> {
  const ref = useRef<ScrambleProvider | null>(null)
  if (ref.current === null) {
    ref.current = createCubingScrambleProvider()
  }
  return ref
}

export function TimerScreen() {
  const { t } = useI18n()
  const session = useSession()
  const { record } = session
  const providerRef = useScrambleProviderRef()
  const [scramble, setScramble] = useState('')
  const [loadingScramble, setLoadingScramble] = useState(true)
  const [scrambleError, setScrambleError] = useState(false)
  const { settings, updateSettings } = useSettings()

  const nextScramble = useCallback(async () => {
    setLoadingScramble(true)
    try {
      const next = await providerRef.current!.next('3x3')
      setScramble(next)
      setScrambleError(false)
    } catch {
      setScrambleError(true)
    } finally {
      setLoadingScramble(false)
    }
  }, [providerRef])

  useEffect(() => {
    let cancelled = false
    // Inlined rather than calling nextScramble(): invoking an external
    // setState-calling callback directly from an effect body trips
    // react-hooks/set-state-in-effect. nextScramble itself is still used by
    // the refresh button and the solve-complete handler below.
    providerRef.current!.next('3x3').then(
      (next) => {
        if (cancelled) return
        setScramble(next)
        setScrambleError(false)
        setLoadingScramble(false)
      },
      () => {
        if (cancelled) return
        setScrambleError(true)
        setLoadingScramble(false)
      },
    )
    return () => {
      cancelled = true
    }
  }, [providerRef])

  const recordSolve = useCallback(
    async (result: SolveResult) => {
      // A failed save is handled inside useSession: the solve stays on
      // screen either way, so the scramble always advances.
      await record(result, scramble)
      await nextScramble()
    },
    [nextScramble, record, scramble],
  )

  // `flex-1` rather than `min-h-svh`: the page sits under the site nav, so a
  // full-viewport main would always overflow by the nav's height. Filling the
  // space the nav leaves keeps the scramble, the timer and the session
  // statistics inside one screen, and lets the document grow only once the
  // solve list has something to show.
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-6">
      <header className="flex w-full items-center justify-between gap-4">
        <div className="flex flex-wrap items-baseline gap-x-3">
          <h1 className="text-lg font-semibold">{t.appName}</h1>
          {/* On a phone every line above the touch pads costs the user the pads
            * themselves, and the tagline is the one line that says nothing the
            * screen below it does not already say. */}
          <p className="hidden text-sm text-neutral-400 sm:block">{t.tagline}</p>
        </div>
        <SettingsDialog settings={settings} onChange={updateSettings} />
      </header>
      <ScrambleBar
        scramble={scramble}
        loading={loadingScramble}
        error={scrambleError}
        onRefresh={() => void nextScramble()}
      />
      {/* The timer takes every pixel the rest of the page does not need, and
        * stays centred in it: the focal point on a tall screen, compact on a
        * short one. */}
      <div className="flex w-full flex-1 flex-col justify-center">
        <TimerPanel
          config={{ keys: settings.keys, holdMs: HOLD_MS, inspectionMs: INSPECTION_MS }}
          hideTimeWhileSolving={settings.hideTimeWhileSolving}
          sounds={settings.sounds}
          onSolveComplete={(result) => void recordSolve(result)}
        />
      </div>
      <SessionStats stats={session.stats} />
      <SolveList
        solves={session.solves}
        onPenalty={(id, penalty) => void session.setPenalty(id, penalty)}
        onRemove={(id) => void session.remove(id)}
        onClear={() => void session.clear()}
      />
    </main>
  )
}
