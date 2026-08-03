import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { createSolve } from '@/lib/storage'
import { createLocalSolveRepository } from '@/lib/storage/local-repository'
import { useSession } from './use-session'

describe('useSession', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('loads solves that were already stored, oldest first', async () => {
    const repository = createLocalSolveRepository()
    await repository.add(
      createSolve({ scramble: "R U R' U'", rawMs: 12_340, inspectionMs: 9_000, penalty: 'none' }),
    )
    await repository.add(
      createSolve({ scramble: "L D L' D'", rawMs: 11_110, inspectionMs: 8_000, penalty: 'none' }),
    )
    const { result } = renderHook(() => useSession(repository))
    await waitFor(() => expect(result.current.solves).toHaveLength(2))
    expect(result.current.solves.map((solve) => solve.rawMs)).toEqual([12_340, 11_110])
    expect(result.current.stats.best).toBe(11_110)
  })

  it('records a solve with its scramble and updates the statistics', async () => {
    const repository = createLocalSolveRepository()
    const { result } = renderHook(() => useSession(repository))
    await act(async () => {
      await result.current.record(
        { rawMs: 12_340, inspectionMs: 9_000, penalty: 'none' },
        "R U R' U'",
      )
    })
    expect(result.current.solves).toHaveLength(1)
    expect(result.current.solves[0].scramble).toBe("R U R' U'")
    expect(result.current.stats.best).toBe(12_340)
  })

  it('applies a penalty to a recorded solve', async () => {
    const repository = createLocalSolveRepository()
    const { result } = renderHook(() => useSession(repository))
    await act(async () => {
      await result.current.record(
        { rawMs: 12_340, inspectionMs: 9_000, penalty: 'none' },
        "R U R' U'",
      )
    })
    await act(async () => {
      await result.current.setPenalty(result.current.solves[0].id, 'dnf')
    })
    expect(result.current.solves[0].penalty).toBe('dnf')
    expect(result.current.stats.best).toBeNull()
  })

  it('removes a solve and clears the session', async () => {
    const repository = createLocalSolveRepository()
    const { result } = renderHook(() => useSession(repository))
    await act(async () => {
      await result.current.record(
        { rawMs: 12_340, inspectionMs: 9_000, penalty: 'none' },
        "R U R' U'",
      )
      await result.current.record(
        { rawMs: 11_110, inspectionMs: 9_000, penalty: 'none' },
        "L D L' D'",
      )
    })
    await act(async () => {
      await result.current.remove(result.current.solves[0].id)
    })
    expect(result.current.solves).toHaveLength(1)
    await act(async () => {
      await result.current.clear()
    })
    expect(result.current.solves).toEqual([])
    expect(result.current.stats.count).toBe(0)
  })
})
