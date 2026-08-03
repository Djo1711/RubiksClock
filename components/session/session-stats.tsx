'use client'

import { useI18n } from '@/components/i18n-provider'
import { formatMs } from '@/lib/format'
import type { SessionStats as Stats } from '@/lib/stats'

const EM_DASH = '—'

const show = (value: number | null) => (value === null ? EM_DASH : formatMs(value))

export function SessionStats({ stats }: { stats: Stats }) {
  const { t } = useI18n()
  const cells = [
    { label: t.solveCount, value: stats.count.toString(), best: false },
    { label: t.best, value: show(stats.best), best: true },
    { label: t.worst, value: show(stats.worst), best: false },
    { label: t.mo3, value: show(stats.mo3), best: false },
    { label: t.ao5, value: show(stats.ao5), best: false },
    { label: t.ao12, value: show(stats.ao12), best: false },
    { label: t.sessionMean, value: show(stats.sessionMean), best: false },
  ]
  return (
    <section
      aria-label={t.statsTitle}
      className="grid w-full grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-7"
    >
      {cells.map((cell) => (
        <div
          key={cell.label}
          className="rounded-lg border border-neutral-800 bg-neutral-900/50 px-3 py-2 text-center"
        >
          <div className="text-[0.7rem] tracking-wide text-neutral-500 uppercase">
            {cell.label}
          </div>
          <div
            className={`font-mono text-lg tabular-nums ${
              cell.best ? 'text-(--color-state-ready)' : 'text-neutral-100'
            }`}
          >
            {cell.value}
          </div>
        </div>
      ))}
    </section>
  )
}
