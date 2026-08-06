import { describe, expect, it } from 'vitest'
import {
  applyScramble,
  FACES,
  invertAlgorithm,
  MOVE_BASES,
  solvedState,
  type CubeState,
  type Face,
  type Facelet,
} from './facelets'
import { expectFirstTwoLayersIntact } from './testing'

const SOLVED = solvedState()

/**
 * Every move of the notation the parser accepts, derived from the grammar itself
 * so that adding a base without extending these invariants is impossible.
 */
const MOVES = MOVE_BASES.flatMap((base) => [base, `${base}'`, `${base}2`])

/** How many stickers of each colour a state holds. */
function colourCounts(state: CubeState): Record<Facelet, number> {
  const counts = { U: 0, R: 0, F: 0, D: 0, L: 0, B: 0 }
  for (const face of state) for (const sticker of face) counts[sticker] += 1
  return counts
}

/** The nine stickers of one named face. */
function face(state: CubeState, name: Face): Facelet[] {
  return state[FACES.indexOf(name)]
}

/** The centre sticker of one named face. */
function centre(state: CubeState, name: Face): Facelet {
  return face(state, name)[4]
}

/**
 * The nine stickers of one face, turned a quarter turn clockwise: the sticker
 * landing on row-major `(r, c)` comes from `(2 - c, r)`. Spelled out here rather
 * than imported so the tests do not lean on the table they are checking.
 */
function quarterTurnClockwise(stickers: Facelet[]): Facelet[] {
  return [0, 1, 2].flatMap((row) => [0, 1, 2].map((column) => stickers[3 * (2 - column) + row]))
}

/** `move` repeated `times`, as a scramble string. */
function repeat(move: string, times: number): string {
  return Array.from({ length: times }, () => move).join(' ')
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

describe('MOVE_BASES', () => {
  it('covers face turns, slices, both spellings of every wide turn, and the rotations', () => {
    expect([...MOVE_BASES].sort()).toEqual(
      [
        'U',
        'R',
        'F',
        'D',
        'L',
        'B',
        'M',
        'E',
        'S',
        'Rw',
        'r',
        'Lw',
        'l',
        'Uw',
        'u',
        'Dw',
        'd',
        'Fw',
        'f',
        'Bw',
        'b',
        'x',
        'y',
        'z',
      ].sort(),
    )
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
    expect(applyScramble(`${move} ${invertAlgorithm(move)}`)).toEqual(SOLVED)
  })

  it.each(MOVES)('moves at least one sticker: %s', (move) => {
    // Guards the order-4 and inverse invariants above, which a turn
    // implemented as a no-op would also satisfy.
    expect(applyScramble(move)).not.toEqual(SOLVED)
  })

  it.each(MOVES)('conserves colours: %s', (move) => {
    expect(colourCounts(applyScramble(`${SCRAMBLE} ${move}`))).toEqual({
      U: 9,
      R: 9,
      F: 9,
      D: 9,
      L: 9,
      B: 9,
    })
  })

  it('is undone by the reversed inverse of a whole scramble', () => {
    expect(applyScramble(`${SCRAMBLE} ${invertAlgorithm(SCRAMBLE)}`)).toEqual(SOLVED)
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

  it.each([
    'X',
    'R3',
    "R''",
    "U'2",
    'RU',
    'R22',
    '2R',
    "'",
    'm',
    'e',
    'Mw',
    'xw',
    'w',
    "x'2",
    'Rww',
  ])('throws on the malformed token %s, naming it', (token) => {
    expect(() => applyScramble(`R U ${token} F`)).toThrowError(
      new Error(`Invalid move in scramble: "${token}"`),
    )
  })

  it('returns a fresh state each call, so a caller cannot corrupt the next one', () => {
    const first = applyScramble(SCRAMBLE)
    const second = applyScramble(SCRAMBLE)
    expect(second).toEqual(first)
    expect(second).not.toBe(first)
    expect(second[0]).not.toBe(first[0])
    expect(solvedState()).not.toBe(SOLVED)
  })
})

describe('slice turns', () => {
  // A slice carries the centre stickers of the four faces it crosses, so a face
  // can end up with a different centre colour. An implementation that turns only
  // the edge stickers passes order 4, inversion and colour conservation, so the
  // centres have to be pinned directly.
  const CENTRE_CYCLES = [
    // M turns like L: the U centre goes to F, F to D, D to B, B back to U.
    ['M', ['U', 'F', 'D', 'B'], ['L', 'R']],
    // E turns like D.
    ['E', ['F', 'R', 'B', 'L'], ['U', 'D']],
    // S turns like F.
    ['S', ['U', 'R', 'D', 'L'], ['F', 'B']],
  ] as const

  it.each(CENTRE_CYCLES)('%s carries the centres round its four faces', (slice, cycle) => {
    const turned = applyScramble(slice)
    cycle.forEach((from, index) => {
      const to = cycle[(index + 1) % 4]
      expect(centre(turned, to), `${slice} moves the ${from} centre to ${to}`).toBe(from)
    })
  })

  it.each(CENTRE_CYCLES)(
    '%s leaves the centres of its two parallel faces alone',
    (slice, _cycle, parallel) => {
      const turned = applyScramble(slice)
      for (const name of parallel) expect(centre(turned, name), `${name} centre`).toBe(name)
    },
  )

  it.each(CENTRE_CYCLES)(
    '%s does not touch either face parallel to it',
    (slice, _cycle, parallel) => {
      const turned = applyScramble(`${SCRAMBLE} ${slice}`)
      const before = applyScramble(SCRAMBLE)
      for (const name of parallel) {
        expect(face(turned, name), `${name} face`).toEqual(face(before, name))
      }
    },
  )

  it('moves the U centre off the U colour with M, and onto the D colour with M2', () => {
    expect(centre(applyScramble('M'), 'U')).not.toBe('U')
    expect(centre(applyScramble('M2'), 'U')).toBe('D')
  })
})

describe('wide turns', () => {
  /** Each wide turn and the face-plus-slice composition it is defined to equal. */
  const WIDE_TURNS = [
    ['r', "R M'"],
    ['l', 'L M'],
    ['u', "U E'"],
    ['d', 'D E'],
    ['f', 'F S'],
    ['b', "B S'"],
  ] as const

  it.each(WIDE_TURNS)(
    '%s turns the face and the slice next to it: equals %s',
    (wide, composition) => {
      expect(applyScramble(`${SCRAMBLE} ${wide}`)).toEqual(
        applyScramble(`${SCRAMBLE} ${composition}`),
      )
    },
  )

  it.each(WIDE_TURNS)('%s spelled the wide way is the same move', (wide) => {
    const wideSpelling = `${wide.toUpperCase()}w`
    for (const suffix of ['', "'", '2']) {
      expect(
        applyScramble(`${SCRAMBLE} ${wideSpelling}${suffix}`),
        `${wideSpelling}${suffix}`,
      ).toEqual(applyScramble(`${SCRAMBLE} ${wide}${suffix}`))
    }
  })
})

describe('whole-cube rotations', () => {
  const ROTATIONS = ['x', 'y', 'z'] as const

  it.each(ROTATIONS)('%s has order 4', (rotation) => {
    expect(applyScramble(`${SCRAMBLE} ${repeat(rotation, 4)}`)).toEqual(applyScramble(SCRAMBLE))
    expect(applyScramble(`${SCRAMBLE} ${repeat(rotation, 2)}`)).not.toEqual(applyScramble(SCRAMBLE))
  })

  it.each(ROTATIONS)('%s2 is %s twice', (rotation) => {
    expect(applyScramble(`${SCRAMBLE} ${rotation}2`)).toEqual(
      applyScramble(`${SCRAMBLE} ${repeat(rotation, 2)}`),
    )
  })

  it.each(ROTATIONS.flatMap((rotation) => [rotation, `${rotation}'`, `${rotation}2`]))(
    'cannot scramble anything: %s leaves every face uniform',
    (rotation) => {
      const rotated = applyScramble(rotation)
      for (const stickers of rotated) {
        expect(new Set(stickers).size, stickers.join('')).toBe(1)
      }
      expect(colourCounts(rotated)).toEqual({ U: 9, R: 9, F: 9, D: 9, L: 9, B: 9 })
    },
  )

  it('relabels the four side faces with y, sticker for sticker', () => {
    // y turns the whole cube the way U turns its layer, so the face that was at
    // R is now at F, and every one of its nine stickers lands on the matching
    // index — the strongest statement that a rotation really is a rotation.
    const before = applyScramble(SCRAMBLE)
    const after = applyScramble(`${SCRAMBLE} y`)
    const moves: readonly [Face, Face][] = [
      ['R', 'F'],
      ['B', 'R'],
      ['L', 'B'],
      ['F', 'L'],
    ]
    for (const [from, to] of moves) {
      expect(face(after, to), `${from} face is now at ${to}`).toEqual(face(before, from))
    }
  })

  it('relabels all four faces on its axis with x, sticker for sticker', () => {
    // x turns the whole cube the way R turns its layer: F comes up to U, U goes
    // back to B, B goes down to D and D comes forward to F. The two faces that
    // pass over the back are relabelled upside down, because B is indexed as seen
    // from behind — which makes this the sharpest check on that convention.
    const before = applyScramble(SCRAMBLE)
    const after = applyScramble(`${SCRAMBLE} x`)
    const moves: readonly [Face, Face, boolean][] = [
      ['F', 'U', false],
      ['U', 'B', true],
      ['B', 'D', true],
      ['D', 'F', false],
    ]
    for (const [from, to, upsideDown] of moves) {
      const moved = face(before, from)
      expect(face(after, to), `${from} face is now at ${to}`).toEqual(
        upsideDown ? [...moved].reverse() : moved,
      )
    }
  })

  it('relabels all four faces on its axis with z, a quarter turn each', () => {
    // z turns the whole cube the way F turns its layer: U goes round to R, R to
    // D, D to L and L to U. None of those four faces keeps its own orientation —
    // each arrives turned a quarter turn clockwise, exactly as the F face itself
    // does when F is turned.
    const before = applyScramble(SCRAMBLE)
    const after = applyScramble(`${SCRAMBLE} z`)
    const moves: readonly [Face, Face][] = [
      ['U', 'R'],
      ['R', 'D'],
      ['D', 'L'],
      ['L', 'U'],
    ]
    for (const [from, to] of moves) {
      expect(face(after, to), `${from} face is now at ${to}`).toEqual(
        quarterTurnClockwise(face(before, from)),
      )
    }
  })

  it.each([
    ["y R y'", 'B'],
    ["x U x'", 'F'],
    ["z R z'", 'U'],
  ])('turns the face the rotation brings round: %s is %s', (conjugation, equivalent) => {
    // Conjugating a turn by a rotation must turn whichever layer the rotation
    // moves into that position — an identity no approximate rotation satisfies.
    expect(applyScramble(`${SCRAMBLE} ${conjugation}`)).toEqual(
      applyScramble(`${SCRAMBLE} ${equivalent}`),
    )
  })

  it.each([
    ['x', "r L'"],
    ['y', "u D'"],
    ['z', "f B'"],
  ])('agrees with the wide-turn definitions: %s equals %s', (rotation, viaWide) => {
    // Independent routes to the same state: the rotation is defined from the two
    // faces and the slice, this one from the wide turn and the opposite face. A
    // sign error in either definition breaks the pair.
    expect(applyScramble(`${SCRAMBLE} ${rotation}`)).toEqual(
      applyScramble(`${SCRAMBLE} ${viaWide}`),
    )
  })
})

describe('invertAlgorithm', () => {
  it('returns an empty algorithm for an empty one', () => {
    expect(invertAlgorithm('')).toBe('')
    expect(invertAlgorithm('  \n ')).toBe('')
  })

  it('reverses the tokens and inverts each one', () => {
    expect(invertAlgorithm("R U R' U'")).toBe("U R U' R'")
  })

  it('leaves a half turn as its own inverse', () => {
    expect(invertAlgorithm('R2')).toBe('R2')
    expect(invertAlgorithm('R2 U2')).toBe('U2 R2')
  })

  it('inverts wide turns, slices and rotations too', () => {
    expect(invertAlgorithm("r U x2 M'")).toBe("M x2 U' r'")
  })

  it('returns to solved when applied after the algorithm it inverts', () => {
    expect(applyScramble(`${SCRAMBLE} ${invertAlgorithm(SCRAMBLE)}`)).toEqual(SOLVED)
  })

  it('returns to solved for an algorithm of wide turns, slices and rotations', () => {
    const algorithm = "r U R' U' M2 x y' Fw2 D S' l' Bw"
    expect(applyScramble(`${algorithm} ${invertAlgorithm(algorithm)}`)).toEqual(SOLVED)
  })

  it('is its own undoing: inverting twice restores the original', () => {
    expect(invertAlgorithm(invertAlgorithm(SCRAMBLE))).toBe(SCRAMBLE)
    expect(applyScramble(invertAlgorithm(invertAlgorithm(SCRAMBLE)))).toEqual(
      applyScramble(SCRAMBLE),
    )
  })

  it('derives the case an algorithm solves: the inverse, then the algorithm, is solved', () => {
    // How the CFOP figures are built — the inverse applied to a solved cube is
    // exactly the position the algorithm solves.
    const algorithm = "R U R' U R U2 R'"
    const scrambledCase = applyScramble(invertAlgorithm(algorithm))
    expect(scrambledCase).not.toEqual(SOLVED)
    expect(applyScramble(`${invertAlgorithm(algorithm)} ${algorithm}`)).toEqual(SOLVED)
  })
})

describe('known algorithms', () => {
  it("has order 6 for Sune (R U R' U R U2 R')", () => {
    const sune = "R U R' U R U2 R'"
    for (const times of [1, 2, 3, 4, 5]) {
      expect(applyScramble(repeat(sune, times)), `Sune x${times}`).not.toEqual(SOLVED)
    }
    expect(applyScramble(repeat(sune, 6))).toEqual(SOLVED)
  })

  it("leaves the first two layers intact for the wide-turn OLL (r U R' U' r' F R F')", () => {
    // A last-layer algorithm that disturbed the first two layers would not be a
    // last-layer algorithm. Because it uses a wide turn, this only holds if the
    // wide turn is the exact composition of a face and a slice.
    const oll = "r U R' U' r' F R F'"
    const state = applyScramble(oll)
    expectFirstTwoLayersIntact(state)
    expect(state).not.toEqual(SOLVED)
  })

  it('leaves the first two layers intact for a T-perm', () => {
    expectFirstTwoLayersIntact(applyScramble("R U R' U' R' F R2 U' R' U' R U R' F'"))
  })

  it('rejects a first-two-layers claim when the first two layers are not intact', () => {
    // Keeps the helper honest: it has to fail on a cube whose bottom layers moved.
    expect(() => expectFirstTwoLayersIntact(applyScramble('D'))).toThrowError()
    expect(() => expectFirstTwoLayersIntact(applyScramble('R'))).toThrowError()
  })
})
