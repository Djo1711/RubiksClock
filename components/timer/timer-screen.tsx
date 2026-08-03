'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useI18n } from '@/components/i18n-provider'
import { ScrambleBar } from '@/components/scramble/scramble-bar'
import { TimerPanel } from '@/components/timer/timer-panel'
import { createCubingScrambleProvider } from '@/lib/scramble/cubing-provider'

export function TimerScreen() {
  const { t } = useI18n()
  const provider = useRef(createCubingScrambleProvider())
  const [scramble, setScramble] = useState('')
  const [loadingScramble, setLoadingScramble] = useState(true)
  const [scrambleError, setScrambleError] = useState(false)

  const nextScramble = useCallback(async () => {
    setLoadingScramble(true)
    try {
      const next = await provider.current.next('3x3')
      setScramble(next)
      setScrambleError(false)
    } catch {
      setScrambleError(true)
    } finally {
      setLoadingScramble(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    // Inlined rather than calling nextScramble(): invoking an external
    // setState-calling callback directly from an effect body trips
    // react-hooks/set-state-in-effect. nextScramble itself is still used by
    // the refresh button and the solve-complete handler below.
    provider.current.next('3x3').then(
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
  }, [])

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-4xl flex-col items-center gap-10 px-4 py-8">
      <header className="w-full">
        <h1 className="text-lg font-semibold">{t.appName}</h1>
        <p className="text-sm text-neutral-400">{t.tagline}</p>
      </header>
      <ScrambleBar
        scramble={scramble}
        loading={loadingScramble}
        error={scrambleError}
        onRefresh={() => void nextScramble()}
      />
      <TimerPanel onSolveComplete={() => void nextScramble()} />
    </main>
  )
}
