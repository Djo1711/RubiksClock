/**
 * Assertions about a {@link CubeState} that more than one test file needs. Kept
 * out of `*.test.ts` so vitest does not collect it as a suite of its own.
 */

import { expect } from 'vitest'
import { FACES, solvedState, type CubeState } from './facelets'

const SOLVED = solvedState()

/**
 * Asserts that the first two layers are solved: the whole `D` face, plus the
 * bottom two rows of all four side faces. Every last-layer algorithm — OLL and
 * PLL alike — must leave exactly this much untouched, so it is the check that
 * validates an algorithm really is the algorithm it claims to be.
 */
export function expectFirstTwoLayersIntact(state: CubeState): void {
  const face = (of: CubeState, name: (typeof FACES)[number]) => of[FACES.indexOf(name)]

  expect(face(state, 'D'), 'D face').toEqual(face(SOLVED, 'D'))
  for (const name of ['R', 'F', 'L', 'B'] as const) {
    expect(face(state, name).slice(3), `${name} bottom two rows`).toEqual(
      face(SOLVED, name).slice(3),
    )
  }
}
