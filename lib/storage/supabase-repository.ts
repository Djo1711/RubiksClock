import type { SolveRepository } from './types'

const NOT_CONFIGURED =
  'The Supabase solve repository is not configured yet. See docs/ROADMAP.md, "Accounts and history".'

/**
 * Placeholder for the accounts milestone. Every method throws until the
 * Supabase project exists and `getSolveRepository()` is pointed here.
 */
export function createSupabaseSolveRepository(): SolveRepository {
  const reject = () => Promise.reject(new Error(NOT_CONFIGURED))
  return {
    list: reject,
    add: reject,
    updatePenalty: reject,
    remove: reject,
    clear: reject,
  }
}
