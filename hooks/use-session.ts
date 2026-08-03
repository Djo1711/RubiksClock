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

  // Every mutation funnels through here so a failed write can never become an
  // unhandled rejection, and the rendered state always re-reads from storage
  // afterwards — even when the write failed, so the UI matches what persisted.
  const mutate = useCallback(
    async (operation: () => Promise<void>, description: string) => {
      try {
        await operation()
      } catch (error) {
        console.error(`Could not ${description}`, error)
      }
      try {
        setSolves(await store.list())
      } catch (error) {
        console.error('Could not read the session', error)
      }
    },
    [store],
  )

  // Guarded the same way as every other mutation: a failed initial read must
  // not become an unhandled rejection either.
  const load = useCallback(async () => {
    try {
      setSolves(await store.list())
    } catch (error) {
      console.error('Could not load the session', error)
    }
  }, [store])

  useEffect(() => {
    void load()
  }, [load])

  const record = useCallback(
    async (result: SolveResult, scramble: string) => {
      await mutate(() => store.add(createSolve({ ...result, scramble })), 'save the solve')
    },
    [mutate, store],
  )

  const setPenalty = useCallback(
    async (id: string, penalty: Penalty) => {
      await mutate(() => store.updatePenalty(id, penalty), 'update the penalty')
    },
    [mutate, store],
  )

  const remove = useCallback(
    async (id: string) => {
      await mutate(() => store.remove(id), 'delete the solve')
    },
    [mutate, store],
  )

  const clear = useCallback(async () => {
    await mutate(() => store.clear(), 'clear the session')
  }, [mutate, store])

  const stats = useMemo(() => sessionStats(solves), [solves])

  return { solves, stats, record, setPenalty, remove, clear }
}
