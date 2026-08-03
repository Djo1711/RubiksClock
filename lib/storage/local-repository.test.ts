import { beforeEach, describe, expect, it } from 'vitest'
import { createLocalSolveRepository, STORAGE_KEY } from './local-repository'
import { createSolve } from './types'

function attempt(rawMs: number) {
  return createSolve({ scramble: "R U R' U'", rawMs, inspectionMs: 9_000, penalty: 'none' })
}

describe('createLocalSolveRepository', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('starts empty', async () => {
    await expect(createLocalSolveRepository().list()).resolves.toEqual([])
  })

  it('round-trips a solve', async () => {
    const repository = createLocalSolveRepository()
    const solve = attempt(12_340)
    await repository.add(solve)
    await expect(repository.list()).resolves.toEqual([solve])
  })

  it('returns solves oldest first', async () => {
    const repository = createLocalSolveRepository()
    const older = { ...attempt(12_340), createdAt: '2026-08-01T10:00:00.000Z' }
    const newer = { ...attempt(11_110), createdAt: '2026-08-02T10:00:00.000Z' }
    await repository.add(newer)
    await repository.add(older)
    const solves = await repository.list()
    expect(solves.map((solve) => solve.rawMs)).toEqual([12_340, 11_110])
  })

  it('updates a penalty', async () => {
    const repository = createLocalSolveRepository()
    const solve = attempt(12_340)
    await repository.add(solve)
    await repository.updatePenalty(solve.id, 'plus2')
    const [stored] = await repository.list()
    expect(stored.penalty).toBe('plus2')
  })

  it('removes a solve', async () => {
    const repository = createLocalSolveRepository()
    const solve = attempt(12_340)
    await repository.add(solve)
    await repository.remove(solve.id)
    await expect(repository.list()).resolves.toEqual([])
  })

  it('clears the session', async () => {
    const repository = createLocalSolveRepository()
    await repository.add(attempt(12_340))
    await repository.clear()
    await expect(repository.list()).resolves.toEqual([])
  })

  it('ignores a corrupted payload instead of throwing', async () => {
    localStorage.setItem(STORAGE_KEY, 'not json')
    await expect(createLocalSolveRepository().list()).resolves.toEqual([])
  })

  it('drops entries that are not shaped like solves', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([{ id: 'x' }, attempt(12_340)]))
    const solves = await createLocalSolveRepository().list()
    expect(solves).toHaveLength(1)
  })
})

describe('createSolve', () => {
  it('assigns an id, a timestamp and the 3x3 puzzle', () => {
    const solve = createSolve({
      scramble: "R U R' U'",
      rawMs: 12_340,
      inspectionMs: 9_000,
      penalty: 'none',
    })
    expect(solve.id).toMatch(/[0-9a-f-]{36}/)
    expect(Number.isNaN(Date.parse(solve.createdAt))).toBe(false)
    expect(solve.puzzle).toBe('3x3')
  })
})
