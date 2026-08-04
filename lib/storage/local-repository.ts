import { getSafeStorage, safeSetItem } from '@/lib/storage/safe-storage'
import type { Penalty } from '@/lib/timer/penalties'
import { isSolve, type Solve, type SolveRepository } from './types'

export const STORAGE_KEY = 'rubiksclock.solves.v1'

function read(storage: Storage | null): Solve[] {
  if (!storage) return []
  const raw = storage.getItem(STORAGE_KEY)
  if (!raw) return []
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return []
  }
  if (!Array.isArray(parsed)) return []
  return parsed
    .filter(isSolve)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}

function write(storage: Storage | null, solves: Solve[]): void {
  safeSetItem(storage, STORAGE_KEY, JSON.stringify(solves))
}

/**
 * Solves in the browser's localStorage. Falls back to a no-op on the server,
 * where there is no storage to read.
 */
export function createLocalSolveRepository(
  storage: Storage | null = getSafeStorage(),
): SolveRepository {
  return {
    async list() {
      return read(storage)
    },
    async add(solve: Solve) {
      write(storage, [...read(storage), solve])
    },
    async updatePenalty(id: string, penalty: Penalty) {
      write(
        storage,
        read(storage).map((solve) => (solve.id === id ? { ...solve, penalty } : solve)),
      )
    },
    async remove(id: string) {
      write(
        storage,
        read(storage).filter((solve) => solve.id !== id),
      )
    },
    async clear() {
      storage?.removeItem(STORAGE_KEY)
    },
  }
}
