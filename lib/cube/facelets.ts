/**
 * Applies a WCA-notation 3x3 scramble to a solved cube and reports the 54
 * stickers that result. Pure: no React, no DOM, no dependency — so the cube net
 * can be rendered on the server, on the first paint, from the scramble alone.
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

/** Three sticker positions on one face, forming one edge of a turning layer. */
type Strip = readonly [Face, readonly [number, number, number]]

/**
 * For each face, the four three-sticker strips of the adjacent faces that its
 * layer carries around, listed in clockwise order as seen looking at that face
 * from outside. Each strip is traversed in that same clockwise direction, so a
 * clockwise quarter turn simply moves entry `j` of every strip to entry `j` of
 * the next one — which is the whole of the geometry, stated once.
 */
const LAYER: Record<Face, readonly [Strip, Strip, Strip, Strip]> = {
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
}

/** A fresh solved cube: every sticker of face `X` is colour `X`. */
export function solvedState(): CubeState {
  return FACES.map((face) => Array.from({ length: 9 }, () => face as Facelet))
}

/**
 * One quarter turn of `face`, clockwise as seen from outside that face.
 * Returns a new state; `before` is left untouched.
 */
function quarterTurn(before: CubeState, face: Face): CubeState {
  const after = before.map((stickers) => stickers.slice())

  const self = after[FACE_INDEX[face]]
  const selfBefore = before[FACE_INDEX[face]]
  for (let i = 0; i < 9; i += 1) self[i] = selfBefore[FACE_ROTATION[i]]

  const strips = LAYER[face]
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
 * A single move: a face letter, optionally suffixed `'` (counter-clockwise) or
 * `2` (half turn). Anything else is a malformed scramble.
 */
const MOVE = /^([URFDLB])(['2])?$/

/** How many clockwise quarter turns each suffix stands for. */
const QUARTER_TURNS = { "'": 3, '2': 2 } as const

/**
 * The state of a solved cube after `scramble`, as six faces of nine stickers in
 * {@link FACES} order. An empty or whitespace-only scramble returns the solved
 * state.
 *
 * @throws {Error} naming the offending token if the scramble is not
 * whitespace-separated WCA face-turn notation. A malformed scramble means the
 * generator or the caller is broken, which is worth surfacing rather than
 * drawing a cube that does not match the moves the user was told to apply.
 */
export function applyScramble(scramble: string): CubeState {
  let state = solvedState()
  const tokens = scramble.trim().split(/\s+/).filter(Boolean)
  for (const token of tokens) {
    const move = MOVE.exec(token)
    if (!move) throw new Error(`Invalid move in scramble: "${token}"`)
    const face = move[1] as Face
    const suffix = move[2] as keyof typeof QUARTER_TURNS | undefined
    const repeats = suffix ? QUARTER_TURNS[suffix] : 1
    for (let i = 0; i < repeats; i += 1) state = quarterTurn(state, face)
  }
  return state
}
