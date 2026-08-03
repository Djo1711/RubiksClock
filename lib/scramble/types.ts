import type { Puzzle } from '@/lib/storage'

export interface ScrambleProvider {
  next(puzzle: Puzzle): Promise<string>
}

/** Deterministic provider for tests and for rendering without a worker. */
export function createStaticScrambleProvider(scrambles: string[]): ScrambleProvider {
  if (scrambles.length === 0) throw new Error('createStaticScrambleProvider needs at least one scramble')
  let index = 0
  return {
    async next() {
      const scramble = scrambles[index % scrambles.length]
      index += 1
      return scramble
    },
  }
}
