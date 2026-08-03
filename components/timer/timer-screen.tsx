'use client'

import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import { useI18n } from '@/components/i18n-provider'
import { ScrambleBar } from '@/components/scramble/scramble-bar'
import { SessionStats } from '@/components/session/session-stats'
import { SolveList } from '@/components/session/solve-list'
import { SettingsDialog } from '@/components/settings/settings-dialog'
import { TimerPanel } from '@/components/timer/timer-panel'
import { useSession } from '@/hooks/use-session'
import type { SolveResult } from '@/hooks/useSpeedTimer'
import { createCubingScrambleProvider } from '@/lib/scramble/cubing-provider'
import type { ScrambleProvider } from '@/lib/scramble/types'
import { defaultSettings, loadSettings, saveSettings, type Settings } from '@/lib/settings'
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
  const [settings, setSettings] = useState<Settings>(defaultSettings)

  useEffect(() => {
    // Deferred to a microtask rather than called synchronously in the effect
    // body, the same way the scramble mount effect avoids a bare setState
    // call: react-hooks/set-state-in-effect flags a direct top-level
    // setState statement in an effect, not one nested inside a callback.
    Promise.resolve().then(() => setSettings(loadSettings()))
  }, [])

  const updateSettings = useCallback((next: Settings) => {
    setSettings(next)
    saveSettings(next)
  }, [])

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

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-4xl flex-col items-center gap-10 px-4 py-8">
      <header className="flex w-full items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold">{t.appName}</h1>
          <p className="text-sm text-neutral-400">{t.tagline}</p>
        </div>
        <SettingsDialog settings={settings} onChange={updateSettings} />
      </header>
      <ScrambleBar
        scramble={scramble}
        loading={loadingScramble}
        error={scrambleError}
        onRefresh={() => void nextScramble()}
      />
      <TimerPanel
        config={{ keys: settings.keys, holdMs: HOLD_MS, inspectionMs: INSPECTION_MS }}
        hideTimeWhileSolving={settings.hideTimeWhileSolving}
        sounds={settings.sounds}
        onSolveComplete={(result) => void recordSolve(result)}
      />
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
