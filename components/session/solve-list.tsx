'use client'

import { useState } from 'react'
import { useI18n } from '@/components/i18n-provider'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { formatMs, formatResult } from '@/lib/format'
import type { Solve } from '@/lib/storage'
import type { Penalty } from '@/lib/timer/penalties'

const PENALTIES: Penalty[] = ['none', 'plus2', 'dnf']

export function SolveList({
  solves,
  onPenalty,
  onRemove,
  onClear,
}: {
  solves: Solve[]
  onPenalty: (id: string, penalty: Penalty) => void
  onRemove: (id: string) => void
  onClear: () => void
}) {
  const { t } = useI18n()
  const [confirming, setConfirming] = useState(false)
  const labels: Record<Penalty, string> = {
    none: t.penaltyNone,
    plus2: t.penaltyPlus2,
    dnf: t.penaltyDnf,
  }

  return (
    <section data-timer-ignore aria-label={t.solvesTitle} className="w-full">
      <h2 className="mb-3 text-sm tracking-wide text-neutral-400 uppercase">
        {t.solvesTitle}
      </h2>
      {solves.length === 0 ? (
        <p className="text-sm text-neutral-500">{t.noSolves}</p>
      ) : (
        <ul className="divide-y divide-neutral-800">
          {[...solves].reverse().map((solve, index) => (
            <li key={solve.id} className="flex flex-wrap items-center gap-3 py-2">
              <span className="w-8 text-right font-mono text-xs text-neutral-500">
                {solves.length - index}
              </span>
              <span className="w-24 font-mono text-lg tabular-nums">
                {formatResult(solve.rawMs, solve.penalty)}
              </span>
              <span className="w-16 font-mono text-xs text-neutral-500">
                {formatMs(solve.inspectionMs)}
              </span>
              <span
                className="min-w-0 flex-1 truncate font-mono text-xs text-neutral-500"
                title={solve.scramble}
              >
                {solve.scramble}
              </span>
              <span className="flex gap-1">
                {PENALTIES.map((penalty) => (
                  <Button
                    key={penalty}
                    size="sm"
                    variant={solve.penalty === penalty ? 'default' : 'outline'}
                    aria-pressed={solve.penalty === penalty}
                    onClick={() => onPenalty(solve.id, penalty)}
                  >
                    {labels[penalty]}
                  </Button>
                ))}
                <Button
                  size="sm"
                  variant="ghost"
                  aria-label={t.deleteSolve}
                  onClick={() => onRemove(solve.id)}
                >
                  ×
                </Button>
              </span>
            </li>
          ))}
        </ul>
      )}
      {solves.length > 0 ? (
        <Dialog open={confirming} onOpenChange={setConfirming}>
          <DialogTrigger render={<Button variant="outline" size="sm" className="mt-4" />}>
            {t.clearSession}
          </DialogTrigger>
          <DialogContent data-timer-ignore>
            <DialogHeader>
              <DialogTitle>{t.clearSessionConfirm}</DialogTitle>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirming(false)}>
                {t.cancel}
              </Button>
              <Button
                onClick={() => {
                  onClear()
                  setConfirming(false)
                }}
              >
                {t.clearSession}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}
    </section>
  )
}
