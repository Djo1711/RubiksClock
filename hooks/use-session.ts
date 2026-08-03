'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { SolveResult } from '@/hooks/useSpeedTimer'
import { sessionStats } from '@/lib/stats'
import { createSolve, getSolveRepository, type Solve, type SolveRepository } from '@/lib/storage'
import type { Penalty } from '@/lib/timer/penalties'

export function useSession(repository?: SolveRepository) {
  const repositoryRef = useRef<SolveRepository | null>(repository ?? null)
  if (repositoryRef.current === null) {
    repositoryRef.current = getSolveRepository()
  }
  const store = repositoryRef.current

  const [solves, setSolves] = useState<Solve[]>([])

  const refresh = useCallback(async () => {
    setSolves(await store.list())
  }, [store])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const record = useCallback(
    async (result: SolveResult, scramble: string) => {
      await store.add(createSolve({ ...result, scramble }))
      await refresh()
    },
    [refresh, store],
  )

  const setPenalty = useCallback(
    async (id: string, penalty: Penalty) => {
      await store.updatePenalty(id, penalty)
      await refresh()
    },
    [refresh, store],
  )

  const remove = useCallback(
    async (id: string) => {
      await store.remove(id)
      await refresh()
    },
    [refresh, store],
  )

  const clear = useCallback(async () => {
    await store.clear()
    await refresh()
  }, [refresh, store])

  const stats = useMemo(() => sessionStats(solves), [solves])

  return { solves, stats, record, setPenalty, remove, clear }
}
