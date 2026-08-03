import type { Penalty } from '@/lib/timer/penalties'

export type Puzzle = '3x3'

export type Solve = {
  id: string
  /** ISO 8601. */
  createdAt: string
  puzzle: Puzzle
  scramble: string
  /** Measured solve time in milliseconds, before any penalty. */
  rawMs: number
  /** Inspection elapsed at the instant the solve started. */
  inspectionMs: number
  penalty: Penalty
}

/**
 * Where solves live. The localStorage implementation ships today; the Supabase
 * one takes over when accounts land, without any change to the UI.
 */
export interface SolveRepository {
  list(): Promise<Solve[]>
  add(solve: Solve): Promise<void>
  updatePenalty(id: string, penalty: Penalty): Promise<void>
  remove(id: string): Promise<void>
  clear(): Promise<void>
}

export function createSolve(
  input: Omit<Solve, 'id' | 'createdAt' | 'puzzle'> & { puzzle?: Puzzle },
): Solve {
  return {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    puzzle: input.puzzle ?? '3x3',
    scramble: input.scramble,
    rawMs: input.rawMs,
    inspectionMs: input.inspectionMs,
    penalty: input.penalty,
  }
}

export function isSolve(value: unknown): value is Solve {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Record<string, unknown>
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.createdAt === 'string' &&
    typeof candidate.scramble === 'string' &&
    typeof candidate.rawMs === 'number' &&
    typeof candidate.inspectionMs === 'number' &&
    (candidate.penalty === 'none' ||
      candidate.penalty === 'plus2' ||
      candidate.penalty === 'dnf')
  )
}
