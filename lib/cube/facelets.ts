/**
 * Applies 3x3 notation to a solved cube and reports the 54 stickers that
 * result. Pure: no React, no DOM, no dependency — so the cube net can be
 * rendered on the server, on the first paint, from the scramble alone.
 *
 * The grammar is WCA scramble notation plus everything CFOP algorithms use:
 * face turns, slice turns, wide turns and whole-cube rotations. See
 * {@link MOVE_BASES}.
 *
 * ## Representation
 *
 * A state is six faces in the order `U R F D L B` (`FACES`), each a 9-element
 * array of sticker colours indexed row-major as seen looking straight at that
 * face from outside the cube:
 *
 * ```
 * 0 1 2
 * 3 4 5
 * 6 7 8
 * ```
 *
 * Which way is "up" for each face is the usual facelet convention, the one that
 * unfolds directly into the conventional cross-shaped net:
 *
 * | Face | row 0 | col 0 |
 * |---|---|---|
 * | `U` | towards `B` | towards `L` |
 * | `R` | towards `U` | towards `F` |
 * | `F` | towards `U` | towards `L` |
 * | `D` | towards `F` | towards `L` |
 * | `L` | towards `U` | towards `B` |
 * | `B` | towards `U` | towards `R` |
 *
 * A colour is named after the face it starts on, so the solved state is the one
 * where every sticker of face `X` reads `'X'`.
 */

/** The six faces, in the canonical order used to index a {@link CubeState}. */
export const FACES = ['U', 'R', 'F', 'D', 'L', 'B'] as const

export type Face = (typeof FACES)[number]

/** A sticker colour, named after the face it occupies when the cube is solved. */
export type Facelet = Face

/** Six faces of nine stickers each, in {@link FACES} order. */
export type CubeState = Facelet[][]

const FACE_INDEX: Record<Face, number> = { U: 0, R: 1, F: 2, D: 3, L: 4, B: 5 }

/**
 * Where each sticker of a face comes from when that face turns a quarter turn
 * clockwise: `rotated[i] = before[FACE_ROTATION[i]]`. A clockwise turn takes
 * row-major `(r, c)` to `(c, 2 - r)`, so the sticker landing on `(r, c)` came
 * from `(2 - c, r)`.
 */
const FACE_ROTATION = [6, 3, 0, 7, 4, 1, 8, 5, 2] as const

/**
 * The three middle layers, each named after the axis it lies on and each turning
 * in the same direction as one of the faces it sits between: `M` (between `L`
 * and `R`) turns like `L`, `E` (between `U` and `D`) turns like `D`, and `S`
 * (between `F` and `B`) turns like `F`.
 */
const SLICES = ['M', 'E', 'S'] as const

type Slice = (typeof SLICES)[number]

/**
 * A layer of the cube that can be turned on its own: one of the six faces, or
 * one of the three middle slices. Every other move in the notation is a
 * composition of these.
 */
type Layer = Face | Slice

/** Three sticker positions on one face, forming one edge of a turning layer. */
type Strip = readonly [Face, readonly [number, number, number]]

/**
 * For each layer, the four three-sticker strips of the surrounding faces that it
 * carries around, listed in clockwise order as seen looking at that layer from
 * outside the face it turns like. Each strip is traversed in that same clockwise
 * direction, so a clockwise quarter turn simply moves entry `j` of every strip
 * to entry `j` of the next one — which is the whole of the geometry, stated
 * once.
 *
 * A slice is its parallel face's entry with each strip slid over by one, from
 * the edge row or column to the middle one: same four faces, same order, same
 * traversal, so a slice turns exactly like the face it is named after minus that
 * face's own rotation. The middle strips include the centre stickers, which is
 * why a slice can change a face's centre colour.
 */
const LAYER: Record<Layer, readonly [Strip, Strip, Strip, Strip]> = {
  U: [
    ['B', [2, 1, 0]],
    ['R', [2, 1, 0]],
    ['F', [2, 1, 0]],
    ['L', [2, 1, 0]],
  ],
  R: [
    ['U', [8, 5, 2]],
    ['B', [0, 3, 6]],
    ['D', [8, 5, 2]],
    ['F', [8, 5, 2]],
  ],
  F: [
    ['U', [6, 7, 8]],
    ['R', [0, 3, 6]],
    ['D', [2, 1, 0]],
    ['L', [8, 5, 2]],
  ],
  D: [
    ['F', [6, 7, 8]],
    ['R', [6, 7, 8]],
    ['B', [6, 7, 8]],
    ['L', [6, 7, 8]],
  ],
  L: [
    ['U', [0, 3, 6]],
    ['F', [0, 3, 6]],
    ['D', [0, 3, 6]],
    ['B', [8, 5, 2]],
  ],
  B: [
    ['U', [2, 1, 0]],
    ['L', [0, 3, 6]],
    ['D', [6, 7, 8]],
    ['R', [8, 5, 2]],
  ],
  // Like L, one column in: L's own face does not move, and the L-adjacent
  // columns of U, F, D and B become the middle ones.
  M: [
    ['U', [1, 4, 7]],
    ['F', [1, 4, 7]],
    ['D', [1, 4, 7]],
    ['B', [7, 4, 1]],
  ],
  // Like D, one row up.
  E: [
    ['F', [3, 4, 5]],
    ['R', [3, 4, 5]],
    ['B', [3, 4, 5]],
    ['L', [3, 4, 5]],
  ],
  // Like F, one layer back.
  S: [
    ['U', [3, 4, 5]],
    ['R', [1, 4, 7]],
    ['D', [5, 4, 3]],
    ['L', [7, 4, 1]],
  ],
}

/** Whether `layer` is one of the six faces rather than one of the three slices. */
function isFace(layer: Layer): layer is Face {
  return (FACES as readonly string[]).includes(layer)
}

/** A fresh solved cube: every sticker of face `X` is colour `X`. */
export function solvedState(): CubeState {
  return FACES.map((face) => Array.from({ length: 9 }, () => face as Facelet))
}

/**
 * One quarter turn of `layer`, clockwise as seen from outside the face it turns
 * like. Returns a new state; `before` is left untouched.
 */
function quarterTurn(before: CubeState, layer: Layer): CubeState {
  const after = before.map((stickers) => stickers.slice())

  // A slice has no face of its own to spin, only the strips it carries.
  if (isFace(layer)) {
    const self = after[FACE_INDEX[layer]]
    const selfBefore = before[FACE_INDEX[layer]]
    for (let i = 0; i < 9; i += 1) self[i] = selfBefore[FACE_ROTATION[i]]
  }

  const strips = LAYER[layer]
  for (let k = 0; k < 4; k += 1) {
    const [fromFace, fromPositions] = strips[k]
    const [toFace, toPositions] = strips[(k + 1) % 4]
    for (let j = 0; j < 3; j += 1) {
      after[FACE_INDEX[toFace]][toPositions[j]] = before[FACE_INDEX[fromFace]][fromPositions[j]]
    }
  }

  return after
}

/**
 * A single move: a base, optionally suffixed `'` (counter-clockwise) or `2`
 * (half turn). Anything else is a malformed algorithm. The wide bases come first
 * in the alternation so that `Rw` is read as one base rather than as `R` with a
 * leftover `w`.
 */
const MOVE = /^([URFDLB]w|[URFDLBMES]|[rludfbxyz])(['2])?$/

/** How many clockwise quarter turns each suffix stands for. */
const QUARTER_TURNS = { "'": 3, '2': 2 } as const

/**
 * The six wide turns, each as the two layers it turns together: the face, plus
 * the slice next to it. `M` turns like `L`, `E` like `D` and `S` like `F`, so a
 * wide turn of one of those three faces takes the slice as-is and the other
 * three take its inverse.
 *
 * Both spellings of a wide turn — `Rw` and `r` — are the same move, and real
 * algorithm sets use both, so each entry registers both names.
 */
const WIDE_TURNS = {
  R: "R M'",
  L: 'L M',
  U: "U E'",
  D: 'D E',
  F: 'F S',
  B: "B S'",
} as const satisfies Record<Face, string>

/**
 * The three whole-cube rotations, each as the three parallel layers it turns at
 * once: both faces on the axis and the slice between them, all in the same
 * direction. Turning every layer of an axis together moves no piece relative to
 * another, so a rotation only relabels which face is where.
 */
const ROTATIONS = {
  x: "R L' M'",
  y: "U D' E'",
  z: "F B' S",
} as const

/**
 * Every base the notation accepts, as the sequence of single-layer quarter turns
 * it is exactly equal to. Only the nine single-layer turns carry geometry; every
 * wide turn and rotation is composed from them, so there is nothing new to get
 * wrong.
 */
const EXPANSIONS: Record<string, readonly Layer[]> = {
  ...Object.fromEntries([...FACES, ...SLICES].map((layer) => [layer, [layer]])),
  ...Object.fromEntries(
    Object.entries(WIDE_TURNS).flatMap(([face, definition]) => [
      [`${face}w`, expandLayers(definition)],
      [face.toLowerCase(), expandLayers(definition)],
    ]),
  ),
  ...Object.fromEntries(
    Object.entries(ROTATIONS).map(([rotation, definition]) => [rotation, expandLayers(definition)]),
  ),
}

/**
 * Every move base the notation accepts, so callers — and the tests that hold
 * this file honest — can enumerate the grammar instead of restating it.
 */
export const MOVE_BASES: readonly string[] = Object.keys(EXPANSIONS)

/**
 * The single-layer quarter turns that `definition` — a space-separated sequence
 * of single-layer moves — stands for. A quarter turn counter-clockwise is three
 * clockwise ones, because every layer turn has order 4.
 */
function expandLayers(definition: string): Layer[] {
  return definition.split(' ').flatMap((token) => {
    const suffix = token.slice(1) as keyof typeof QUARTER_TURNS | ''
    const repeats = suffix ? QUARTER_TURNS[suffix] : 1
    return Array.from({ length: repeats }, () => token[0] as Layer)
  })
}

/**
 * The state of a solved cube after `algorithm`, as six faces of nine stickers in
 * {@link FACES} order. An empty or whitespace-only algorithm returns the solved
 * state.
 *
 * @throws {Error} naming the offending token if the algorithm is not
 * whitespace-separated notation over {@link MOVE_BASES}. A malformed scramble
 * means the generator or the caller is broken, which is worth surfacing rather
 * than drawing a cube that does not match the moves the user was told to apply.
 */
export function applyScramble(scramble: string): CubeState {
  let state = solvedState()
  const tokens = scramble.trim().split(/\s+/).filter(Boolean)
  for (const token of tokens) {
    const move = MOVE.exec(token)
    if (!move) throw new Error(`Invalid move in scramble: "${token}"`)
    const layers = EXPANSIONS[move[1]]
    const suffix = move[2] as keyof typeof QUARTER_TURNS | undefined
    const repeats = suffix ? QUARTER_TURNS[suffix] : 1
    for (let i = 0; i < repeats; i += 1) {
      for (const layer of layers) state = quarterTurn(state, layer)
    }
  }
  return state
}

/**
 * The algorithm that undoes `algorithm`: the same tokens in reverse order, each
 * inverted (`R` becomes `R'`, `R'` becomes `R`, `R2` is its own inverse).
 *
 * Purely textual, so it does not reject a token {@link applyScramble} would:
 * applying the result is what surfaces a malformed one. Deriving a case from the
 * algorithm that solves it needs exactly this — the inverse applied to a solved
 * cube is the position the algorithm solves.
 */
export function invertAlgorithm(algorithm: string): string {
  return algorithm
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .reverse()
    .map((token) =>
      token.endsWith('2') ? token : token.endsWith("'") ? token.slice(0, -1) : `${token}'`,
    )
    .join(' ')
}
