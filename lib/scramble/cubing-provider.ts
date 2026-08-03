import type { Puzzle } from '@/lib/storage'
import type { ScrambleProvider } from './types'

const EVENT_IDS: Record<Puzzle, string> = { '3x3': '333' }

/**
 * Random-state scrambles from cubing.js — the same class of scramble used in
 * competition, rather than a random sequence of moves that may leave the cube
 * nearly solved.
 */
export function createCubingScrambleProvider(): ScrambleProvider {
  return {
    async next(puzzle: Puzzle) {
      const { randomScrambleForEvent } = await import('cubing/scramble')
      const alg = await randomScrambleForEvent(EVENT_IDS[puzzle])
      return alg.toString()
    },
  }
}
