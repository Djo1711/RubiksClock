import { describe, expect, it } from 'vitest'
import {
  applyScramble,
  FACES,
  invertAlgorithm,
  solvedState,
  type CubeState,
  type Face,
} from '../cube/facelets'
import { expectFirstTwoLayersIntact } from '../cube/testing'
import { OLL_CASES, TWO_LOOK_OLL_CASES } from './oll'
import { PLL_CASES, TWO_LOOK_PLL_CASES } from './pll'
import { OLL_FAMILIES, PLL_FAMILIES, type OllCase, type PllCase } from './types'

const SOLVED = solvedState()

/** Where the U face sits in a {@link CubeState}. */
const U = FACES.indexOf('U')

/** One sticker: the face it lies on, and its row-major index within that face. */
type Sticker = readonly [Face, number]

/** One cubie position, as the stickers that make it up. */
type Position = readonly Sticker[]

/** The four last-layer edge positions, going round from the back. */
const LAST_LAYER_EDGES: readonly Position[] = [
  [
    ['U', 1],
    ['B', 1],
  ],
  [
    ['U', 5],
    ['R', 1],
  ],
  [
    ['U', 7],
    ['F', 1],
  ],
  [
    ['U', 3],
    ['L', 1],
  ],
]

/** The four last-layer corner positions, going round from the back left. */
const LAST_LAYER_CORNERS: readonly Position[] = [
  [
    ['U', 0],
    ['L', 0],
    ['B', 2],
  ],
  [
    ['U', 2],
    ['B', 0],
    ['R', 2],
  ],
  [
    ['U', 8],
    ['R', 0],
    ['F', 2],
  ],
  [
    ['U', 6],
    ['F', 0],
    ['L', 2],
  ],
]

/** The state a solved cube is left in by `algorithm`. */
function after(algorithm: string): CubeState {
  return applyScramble(algorithm)
}

/**
 * The case an algorithm solves: the algorithm run backwards from a solved cube,
 * which is exactly the position it puts right.
 */
function caseSolvedBy(algorithm: string): CubeState {
  return applyScramble(invertAlgorithm(algorithm))
}

/** How many of the four last-layer edges show the U colour on the U face. */
function orientedEdges(state: CubeState): number {
  return [1, 3, 5, 7].filter((index) => state[U][index] === 'U').length
}

/** How many of the four last-layer corners show the U colour on the U face. */
function orientedCorners(state: CubeState): number {
  return [0, 2, 6, 8].filter((index) => state[U][index] === 'U').length
}

/**
 * Which cubie sits at a position, as the sorted colours of its stickers. Sorting
 * makes it independent of how the piece is twisted, which is what a permutation
 * check wants.
 */
function pieceAt(state: CubeState, position: Position): string {
  return position
    .map(([face, index]) => state[FACES.indexOf(face)][index])
    .sort()
    .join('')
}

/**
 * How many of the four positions hold a different cubie than they do on a solved
 * cube: the number of pieces the algorithm actually moves.
 */
function movedPieces(state: CubeState, positions: readonly Position[]): number {
  return positions.filter((position) => pieceAt(state, position) !== pieceAt(SOLVED, position))
    .length
}

/** `algorithm` repeated `times`, as one algorithm. */
function repeat(algorithm: string, times: number): string {
  return Array.from({ length: times }, () => algorithm).join(' ')
}

/** `count` U turns, as an algorithm — the empty string for none. */
function auf(count: number): string {
  return repeat('U', count)
}

/**
 * Which of the twenty last-layer stickers show the U colour, as a string. This
 * is the whole of an OLL case: two cases are the same case exactly when their
 * patterns match, so it is what tells the 57 apart from each other.
 */
function orientationPattern(state: CubeState): string {
  const sides = ['R', 'F', 'L', 'B'] as const
  const topRows = sides.flatMap((name) =>
    [0, 1, 2].map((index) => state[FACES.indexOf(name)][index]),
  )
  return [...state[U], ...topRows].map((sticker) => (sticker === 'U' ? '#' : '.')).join('')
}

/**
 * A key that is equal for two OLL algorithms exactly when they solve the same
 * case. Turning the last layer before and after an algorithm turns its case
 * round without changing which case it is, so the key is the smallest of the
 * four patterns the case can be seen as.
 */
function ollCaseKey(algorithm: string): string {
  const inverse = invertAlgorithm(algorithm)
  return [0, 1, 2, 3]
    .map((turns) => orientationPattern(after(`${auf(turns)} ${inverse} ${auf(4 - turns)}`)))
    .sort()[0]
}

/**
 * A key that is equal for two PLL algorithms exactly when they solve the same
 * case. A PLL case is defined up to the last-layer turn before it and the one
 * after, so the key is the smallest state over all sixteen combinations.
 */
function pllCaseKey(algorithm: string): string {
  const keys: string[] = []
  for (let before = 0; before < 4; before += 1) {
    for (let then = 0; then < 4; then += 1) {
      keys.push(JSON.stringify(after(`${auf(before)} ${algorithm} ${auf(then)}`)))
    }
  }
  return keys.sort()[0]
}

/**
 * How many times over `algorithm` has to be applied to bring a solved cube back
 * to solved. Infinite if it does not within a dozen goes, which no last-layer
 * algorithm needs.
 */
function orderOf(algorithm: string): number {
  for (let times = 1; times <= 12; times += 1) {
    if (JSON.stringify(after(repeat(algorithm, times))) === JSON.stringify(SOLVED)) return times
  }
  return Number.POSITIVE_INFINITY
}

/** Every case in both tables, for the checks that apply to all 78 alike. */
const ALL_CASES: readonly { label: string; algorithm: string }[] = [
  ...OLL_CASES.map((entry) => ({
    label: `OLL ${entry.id} ${entry.name}`,
    algorithm: entry.algorithm,
  })),
  ...PLL_CASES.map((entry) => ({ label: `PLL ${entry.name}`, algorithm: entry.algorithm })),
]

describe('every last-layer algorithm', () => {
  it.each(ALL_CASES)('leaves the first two layers intact: $label', ({ algorithm }) => {
    expectFirstTwoLayersIntact(after(algorithm))
  })

  it.each(ALL_CASES)('leaves every centre where it was: $label', ({ algorithm }) => {
    // A net whole-cube rotation would move them, and would make every figure
    // derived from the algorithm come out drawn from the wrong angle.
    const state = after(algorithm)
    FACES.forEach((face, index) => {
      expect(state[index][4], `${face} centre`).toBe(face)
    })
  })

  it.each(ALL_CASES)('does something: $label', ({ algorithm }) => {
    expect(after(algorithm)).not.toEqual(SOLVED)
  })

  it('uses each algorithm for one case only', () => {
    const algorithms = ALL_CASES.map((entry) => entry.algorithm)
    expect(new Set(algorithms).size, algorithms.join('\n')).toBe(algorithms.length)
  })
})

describe('OLL', () => {
  it('holds all 57 cases, numbered 1 to 57, each once', () => {
    expect(OLL_CASES.map((entry) => entry.id)).toEqual(
      Array.from({ length: 57 }, (_, index) => index + 1),
    )
  })

  it('names every case distinctly', () => {
    const names = OLL_CASES.map((entry) => entry.name)
    expect(new Set(names).size).toBe(names.length)
  })

  it('files every case under a known family', () => {
    for (const entry of OLL_CASES) expect(OLL_FAMILIES, `OLL ${entry.id}`).toContain(entry.family)
  })

  it.each(OLL_CASES)('orients the declared number of edges: OLL $id $name', (entry: OllCase) => {
    expect(orientedEdges(caseSolvedBy(entry.algorithm))).toBe(entry.orientedEdges)
  })

  it.each(OLL_CASES)('orients the declared number of corners: OLL $id $name', (entry: OllCase) => {
    expect(orientedCorners(caseSolvedBy(entry.algorithm))).toBe(entry.orientedCorners)
  })

  it.each(OLL_CASES)('solves the case a figure would show: OLL $id $name', (entry: OllCase) => {
    // The page derives the picture of a case by running the algorithm backwards
    // from solved, so the algorithm run forwards from that picture has to leave
    // the U face one colour. That the two cancel is arithmetic rather than a
    // claim about the algorithm — what it pins is the derivation the page
    // depends on, which is why the case itself is checked not to be oriented
    // already just below.
    const solved = after(`${invertAlgorithm(entry.algorithm)} ${entry.algorithm}`)
    expect(new Set(solved[U]).size, solved[U].join('')).toBe(1)
    expect(solved[U][0]).toBe('U')
  })

  it.each(OLL_CASES)('has something left to orient: OLL $id $name', (entry: OllCase) => {
    // Where the teeth are: a case that arrived already oriented would mean the
    // algorithm does nothing to the last layer's orientation.
    expect(new Set(caseSolvedBy(entry.algorithm)[U]).size).toBeGreaterThan(1)
  })

  it('holds 57 different cases, so the table is the whole of OLL', () => {
    const byCase = new Map<string, string>()
    for (const entry of OLL_CASES) {
      const key = ollCaseKey(entry.algorithm)
      expect(byCase.get(key), `OLL ${entry.id} repeats a case`).toBeUndefined()
      byCase.set(key, `OLL ${entry.id}`)
    }
    expect(byCase.size).toBe(57)
  })

  it('gives the dot family no oriented edges and the cross family all four', () => {
    for (const entry of OLL_CASES) {
      if (entry.family === 'dot') expect(entry.orientedEdges, `OLL ${entry.id}`).toBe(0)
      if (entry.family === 'cross') expect(entry.orientedEdges, `OLL ${entry.id}`).toBe(4)
      if (entry.family !== 'dot' && entry.family !== 'cross') {
        expect(entry.orientedEdges, `OLL ${entry.id}`).toBe(2)
      }
    }
  })

  it('leaves the corners-oriented family only its edges to do', () => {
    for (const entry of OLL_CASES) {
      if (entry.family !== 'corners-oriented') continue
      expect(entry.orientedCorners, `OLL ${entry.id}`).toBe(4)
      expect(entry.orientedEdges, `OLL ${entry.id}`).toBe(2)
    }
  })

  it('has three cases whose corners are already oriented: the dot, the L and the line', () => {
    const done = OLL_CASES.filter((entry) => entry.orientedCorners === 4)
    expect(done.map((entry) => entry.id)).toEqual([20, 28, 57])
  })

  it.each([
    [28, 'adjacent', true],
    [57, 'opposite', false],
  ])('leaves OLL %d with its two oriented edges %s', (id, _shape, adjacent) => {
    // The three shapes 2-look OLL recognises apart. OLL 20 is the dot, checked by
    // its edge count above; these two both have two edges up and are told apart
    // only by whether those edges are next to each other.
    const entry = OLL_CASES.find((candidate) => candidate.id === id)!
    const state = caseSolvedBy(entry.algorithm)
    // The four edge stickers of the U face, going round: back, right, front, left.
    const round = [1, 5, 7, 3].map((index) => state[U][index] === 'U')
    const opposite = round[0] === round[2] && round[1] === round[3]
    expect(round.filter(Boolean)).toHaveLength(2)
    expect(!opposite, `OLL ${id} edges`).toBe(adjacent)
  })

  it('teaches ten cases in 2-look: three for the edges, seven for the corners', () => {
    expect(TWO_LOOK_OLL_CASES).toHaveLength(10)
    expect(TWO_LOOK_OLL_CASES.filter((entry) => entry.twoLook === 'edge-orientation')).toHaveLength(
      3,
    )
    expect(
      TWO_LOOK_OLL_CASES.filter((entry) => entry.twoLook === 'corner-orientation'),
    ).toHaveLength(7)
  })

  it('picks for 2-look exactly the cases where one of the two steps is already done', () => {
    for (const entry of OLL_CASES) {
      const cornersDone = entry.orientedCorners === 4
      const edgesDone = entry.orientedEdges === 4
      expect(entry.twoLook === 'edge-orientation', `OLL ${entry.id}`).toBe(cornersDone)
      expect(entry.twoLook === 'corner-orientation', `OLL ${entry.id}`).toBe(edgesDone)
    }
  })
})

describe('PLL', () => {
  const NAMES = [
    'Aa',
    'Ab',
    'E',
    'F',
    'Ga',
    'Gb',
    'Gc',
    'Gd',
    'H',
    'Ja',
    'Jb',
    'Na',
    'Nb',
    'Ra',
    'Rb',
    'T',
    'Ua',
    'Ub',
    'V',
    'Y',
    'Z',
  ]

  /**
   * The four cases that come in a pair, each mapped to the one that undoes it.
   * Every other PLL undoes itself.
   */
  const INVERSE_OF: Record<string, string> = {
    Ua: 'Ub',
    Ub: 'Ua',
    Aa: 'Ab',
    Ab: 'Aa',
    Ga: 'Gb',
    Gb: 'Ga',
    Gc: 'Gd',
    Gd: 'Gc',
  }

  it('holds all 21 cases, each once', () => {
    expect([...PLL_CASES.map((entry) => entry.name)].sort()).toEqual(NAMES)
  })

  it('files every case under a known family', () => {
    for (const entry of PLL_CASES) expect(PLL_FAMILIES, entry.name).toContain(entry.family)
  })

  it.each(PLL_CASES)('leaves the U face one colour: PLL $name', (entry: PllCase) => {
    // A permutation never disorients: if the U face is not uniform afterwards,
    // whatever the algorithm is, it is not a PLL.
    const state = after(entry.algorithm)
    expect(new Set(state[U]).size, state[U].join('')).toBe(1)
    expect(state[U][0]).toBe('U')
  })

  it.each(PLL_CASES)('moves the declared number of corners: PLL $name', (entry: PllCase) => {
    expect(movedPieces(after(entry.algorithm), LAST_LAYER_CORNERS)).toBe(entry.movedCorners)
  })

  it.each(PLL_CASES)('moves the declared number of edges: PLL $name', (entry: PllCase) => {
    expect(movedPieces(after(entry.algorithm), LAST_LAYER_EDGES)).toBe(entry.movedEdges)
  })

  it.each(PLL_CASES)('has the declared order: PLL $name', (entry: PllCase) => {
    // Distinguishes a three-cycle from a pair of swaps, which the counts above
    // cannot: Ga and E both move four pieces, but only one of them comes back
    // after two goes.
    expect(orderOf(entry.algorithm)).toBe(entry.order)
  })

  it.each(PLL_CASES)('carries no stray last-layer turn: PLL $name', (entry: PllCase) => {
    // If an algorithm ended a quarter turn out, every last-layer piece would move
    // and the counts above would be meaningless.
    const moved = entry.movedCorners + entry.movedEdges
    expect(moved, 'total pieces moved').toBeLessThan(8)
  })

  it('matches every family to what its cases actually move', () => {
    for (const entry of PLL_CASES) {
      const expected =
        entry.movedCorners === 0 ? 'edge-only' : entry.movedEdges === 0 ? 'corner-only' : 'both'
      expect(entry.family, entry.name).toBe(expected)
    }
  })

  it('holds 21 different cases, so the table is the whole of PLL', () => {
    const byCase = new Map<string, string>()
    for (const entry of PLL_CASES) {
      const key = pllCaseKey(entry.algorithm)
      expect(byCase.get(key), `PLL ${entry.name} repeats a case`).toBeUndefined()
      byCase.set(key, entry.name)
    }
    expect(byCase.size).toBe(21)
  })

  it.each(PLL_CASES)(
    'is undone by the case its letter pairs it with: PLL $name',
    (entry: PllCase) => {
      // Every PLL either undoes itself or belongs to one of four lettered pairs,
      // so this pins each name to a direction and not only to a shape: it is what
      // tells Ua from Ub, Aa from Ab and Ga from Gb.
      const partner = INVERSE_OF[entry.name] ?? entry.name
      const partnerAlgorithm = PLL_CASES.find((other) => other.name === partner)!.algorithm
      expect(pllCaseKey(invertAlgorithm(entry.algorithm)), `undone by ${partner}`).toBe(
        pllCaseKey(partnerAlgorithm),
      )
    },
  )

  it('teaches seven cases in 2-look: three for the corners, four for the edges', () => {
    expect(TWO_LOOK_PLL_CASES).toHaveLength(7)
    expect(
      TWO_LOOK_PLL_CASES.filter((entry) => entry.twoLook === 'corner-permutation'),
    ).toHaveLength(3)
    expect(TWO_LOOK_PLL_CASES.filter((entry) => entry.twoLook === 'edge-permutation')).toHaveLength(
      4,
    )
  })

  it('picks for 2-look exactly the cases that move one kind of piece alone', () => {
    for (const entry of PLL_CASES) {
      const { name, family, twoLook } = entry
      expect(twoLook === 'corner-permutation', name).toBe(family === 'corner-only')
      expect(twoLook === 'edge-permutation', name).toBe(family === 'edge-only')
    }
  })
})
