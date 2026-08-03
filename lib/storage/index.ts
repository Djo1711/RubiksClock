import { createLocalSolveRepository } from './local-repository'
import type { SolveRepository } from './types'

export { createSolve, type Puzzle, type Solve, type SolveRepository } from './types'
export { STORAGE_KEY } from './local-repository'

/**
 * The single place that decides where solves live. When accounts land, return
 * the Supabase repository for signed-in users and keep the local one for
 * guests — no component changes needed.
 */
export function getSolveRepository(): SolveRepository {
  return createLocalSolveRepository()
}
