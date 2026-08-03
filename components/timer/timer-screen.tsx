'use client'

import { useI18n } from '@/components/i18n-provider'
import { TimerPanel } from '@/components/timer/timer-panel'

export function TimerScreen() {
  const { t } = useI18n()
  return (
    <main className="mx-auto flex min-h-svh w-full max-w-4xl flex-col items-center gap-10 px-4 py-8">
      <header className="w-full">
        <h1 className="text-lg font-semibold">{t.appName}</h1>
        <p className="text-sm text-neutral-400">{t.tagline}</p>
      </header>
      <TimerPanel />
    </main>
  )
}
