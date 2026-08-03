import type { Puzzle } from '@/lib/storage'
import type { ScrambleProvider } from './types'

/**
 * Random-state scrambles from cubing.js — the same class of scramble used in
 * competition, rather than a random sequence of moves that may leave the cube
 * nearly solved.
 *
 * Generation happens server-side, via `/api/scramble`, rather than by
 * importing `cubing/scramble` in the browser: `cubing/scramble` needs a real
 * search worker, and this project's bundler cannot instantiate that worker
 * (see .superpowers/sdd/task-10-report.md for the diagnosis). Node has no
 * such restriction, so the Route Handler does the work instead.
 */
export function createCubingScrambleProvider(): ScrambleProvider {
  return {
    async next(puzzle: Puzzle) {
      const response = await fetch(`/api/scramble?puzzle=${encodeURIComponent(puzzle)}`, {
        cache: 'no-store',
      })
      if (!response.ok) {
        throw new Error(`Failed to fetch scramble: ${response.status} ${response.statusText}`)
      }
      const { scramble } = (await response.json()) as { scramble: string }
      return scramble
    },
  }
}
