import { describe, expect, it } from 'vitest'
import { applyScramble, FACES, solvedState, type CubeState, type Facelet } from './facelets'

const SOLVED = solvedState()

/** Every move of the notation the parser accepts. */
const MOVES = FACES.flatMap((face) => [face, `${face}'`, `${face}2`])

/** How many stickers of each colour a state holds. */
function colourCounts(state: CubeState): Record<Facelet, number> {
  const counts = { U: 0, R: 0, F: 0, D: 0, L: 0, B: 0 }
  for (const face of state) for (const sticker of face) counts[sticker] += 1
  return counts
}

/** `move` repeated `times`, as a scramble string. */
function repeat(move: string, times: number): string {
  return Array.from({ length: times }, () => move).join(' ')
}

/** The scramble that undoes `scramble`: reversed, with every move inverted. */
function inverse(scramble: string): string {
  return scramble
    .trim()
    .split(/\s+/)
    .reverse()
    .map((token) =>
      token.endsWith('2') ? token : token.endsWith("'") ? token.slice(0, -1) : `${token}'`,
    )
    .join(' ')
}

/** A real 20-move WCA-length scramble, used wherever an arbitrary one is needed. */
const SCRAMBLE = "D2 F' R2 U' B2 L2 F2 D' L2 B U2 R' F' D R B' F' U L' B2"

describe('solvedState', () => {
  it('has nine stickers of each colour', () => {
    expect(colourCounts(SOLVED)).toEqual({ U: 9, R: 9, F: 9, D: 9, L: 9, B: 9 })
  })

  it('has a uniform colour on every face, named after that face', () => {
    FACES.forEach((face, index) => {
      expect(SOLVED[index]).toEqual(Array.from({ length: 9 }, () => face))
    })
  })
})

describe('applyScramble', () => {
  it('returns the solved state for an empty scramble', () => {
    expect(applyScramble('')).toEqual(SOLVED)
  })

  it('returns the solved state for a whitespace-only scramble', () => {
    expect(applyScramble('   \n\t ')).toEqual(SOLVED)
  })

  it('ignores extra, leading and trailing whitespace', () => {
    expect(applyScramble("  R\t\tU   R'  U'  ")).toEqual(applyScramble("R U R' U'"))
  })

  it.each(MOVES)('has order 4: %s repeated four times is solved', (move) => {
    expect(applyScramble(repeat(move, 4))).toEqual(SOLVED)
  })

  it.each(MOVES)('is undone by its inverse: %s', (move) => {
    expect(applyScramble(`${move} ${inverse(move)}`)).toEqual(SOLVED)
  })

  it.each(MOVES)('moves at least one sticker: %s', (move) => {
    // Guards the order-4 and inverse invariants above, which a turn
    // implemented as a no-op would also satisfy.
    expect(applyScramble(move)).not.toEqual(SOLVED)
  })

  it('is undone by the reversed inverse of a whole scramble', () => {
    expect(applyScramble(`${SCRAMBLE} ${inverse(SCRAMBLE)}`)).toEqual(SOLVED)
  })

  it("has order 6 for the sexy move (R U R' U')", () => {
    // Pins the relative geometry of R against U: true only if the adjacency
    // strips and their traversal direction are both right.
    expect(applyScramble(repeat("R U R' U'", 6))).toEqual(SOLVED)
    expect(applyScramble(repeat("R U R' U'", 5))).not.toEqual(SOLVED)
  })

  it('has order 105 for R U', () => {
    expect(applyScramble(repeat('R U', 105))).toEqual(SOLVED)
    expect(applyScramble(repeat('R U', 104))).not.toEqual(SOLVED)
  })

  it('conserves colours through an arbitrary scramble', () => {
    expect(colourCounts(applyScramble(SCRAMBLE))).toEqual({
      U: 9,
      R: 9,
      F: 9,
      D: 9,
      L: 9,
      B: 9,
    })
  })

  it('keeps every face a permutation of the solved cube, so no sticker is invented', () => {
    const scrambled = applyScramble(SCRAMBLE)
    expect(scrambled).toHaveLength(6)
    for (const face of scrambled) {
      expect(face).toHaveLength(9)
      for (const sticker of face) expect(FACES).toContain(sticker)
    }
  })

  it('leaves the centre of every face alone: no scramble of face turns moves one', () => {
    const scrambled = applyScramble(SCRAMBLE)
    FACES.forEach((face, index) => {
      expect(scrambled[index][4]).toBe(face)
    })
  })

  it('turns only the right layer for R, and only its column on each neighbour', () => {
    // An independent check on the adjacency data: R carries the U, F and D
    // columns nearest R, plus the B column nearest R — which is B's col 0,
    // because B is indexed as seen from behind — and never touches L.
    const [u, r, f, d, l, b] = applyScramble('R')
    const columns = (face: Facelet[], column: number) => [face[column], face[column + 3], face[column + 6]]

    expect(l).toEqual(SOLVED[4])
    expect(r).toEqual(SOLVED[1])

    for (const [name, face, moved] of [
      ['U', u, 2],
      ['F', f, 2],
      ['D', d, 2],
      ['B', b, 0],
    ] as const) {
      const solvedFace = SOLVED[FACES.indexOf(name)]
      for (const column of [0, 1, 2]) {
        const actual = columns(face, column)
        const expected = columns(solvedFace, column)
        if (column === moved) expect(actual, `${name} col ${column}`).not.toEqual(expected)
        else expect(actual, `${name} col ${column}`).toEqual(expected)
      }
    }
  })

  it.each(['X', 'R3', 'r', "R''", "U'2", 'RU', 'R22', '2R', "'"])(
    'throws on the malformed token %s, naming it',
    (token) => {
      expect(() => applyScramble(`R U ${token} F`)).toThrowError(
        new Error(`Invalid move in scramble: "${token}"`),
      )
    },
  )

  it('returns a fresh state each call, so a caller cannot corrupt the next one', () => {
    const first = applyScramble(SCRAMBLE)
    const second = applyScramble(SCRAMBLE)
    expect(second).toEqual(first)
    expect(second).not.toBe(first)
    expect(second[0]).not.toBe(first[0])
    expect(solvedState()).not.toBe(SOLVED)
  })
})
