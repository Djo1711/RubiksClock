/**
 * The shape of the CFOP last-layer tables: the 57 OLL cases and the 21 PLL
 * cases, as pure data. No React, no DOM — a page renders these, and the
 * verification suite proves each algorithm is the one its name claims.
 *
 * Every algorithm is written in the notation {@link import('../cube/facelets')}
 * executes, and every algorithm is *rotation-neutral*: it may use `x`, `y` and
 * `z` internally, but the rotations must cancel, so applying it to a solved cube
 * leaves all six centres where they were. A figure derived from an algorithm
 * with a net rotation would be drawn from the wrong angle.
 */

/**
 * The conventional shape families the 57 OLL cases are grouped into. The names
 * are the ones every OLL sheet uses; `corners-oriented` is the pair where all
 * four corners are already oriented and only edges are left.
 */
export const OLL_FAMILIES = [
  'dot',
  'line',
  'l-shape',
  'cross',
  'fish',
  'p',
  'w',
  't',
  'c',
  'square',
  'lightning',
  'awkward',
  'knight',
  'corners-oriented',
] as const

export type OllFamily = (typeof OLL_FAMILIES)[number]

/**
 * Which half of 2-look OLL a case belongs to, or `null` if it is a full-OLL case
 * only. 2-look OLL orients the edges first and the corners second, so the subset
 * is the three cases whose corners are already oriented, plus the seven whose
 * edges are.
 */
export type OllTwoLookStep = 'edge-orientation' | 'corner-orientation'

/** How many of a piece type on the last layer already show the U colour. */
export type OrientedCount = 0 | 1 | 2 | 4

/** One of the 57 orientation cases of the last layer. */
export interface OllCase {
  /** The conventional OLL number, 1 to 57. Stable, and the case's real identity. */
  id: number
  /** A readable name in the standard shape vocabulary, unique within the table. */
  name: string
  /** The shape family the case is filed under. */
  family: OllFamily
  /** The algorithm that solves the case, rotation-neutral. */
  algorithm: string
  /** How many of the four last-layer edges already point up in this case. */
  orientedEdges: 0 | 2 | 4
  /** How many of the four last-layer corners already point up in this case. */
  orientedCorners: OrientedCount
  /** Which 2-look OLL step teaches this case, or `null` if it is full-OLL only. */
  twoLook: OllTwoLookStep | null
}

/**
 * Which pieces a PLL moves: only edges, only corners, or some of each. The three
 * groups every PLL sheet is divided into.
 */
export const PLL_FAMILIES = ['edge-only', 'corner-only', 'both'] as const

export type PllFamily = (typeof PLL_FAMILIES)[number]

/**
 * Which half of 2-look PLL a case belongs to, or `null` if it is a full-PLL case
 * only. 2-look PLL permutes the corners first and the edges second.
 */
export type PllTwoLookStep = 'corner-permutation' | 'edge-permutation'

/** One of the 21 permutation cases of the last layer. */
export interface PllCase {
  /** The conventional letter name — `Aa`, `Ub`, `Gc` — which is the case's identity. */
  name: string
  /** The pieces the case moves. */
  family: PllFamily
  /** The algorithm that solves the case, rotation-neutral. */
  algorithm: string
  /** How many of the four last-layer corners the algorithm moves: 0, 2, 3 or 4. */
  movedCorners: 0 | 2 | 3 | 4
  /** How many of the four last-layer edges the algorithm moves: 0, 2, 3 or 4. */
  movedEdges: 0 | 2 | 3 | 4
  /**
   * How many times the algorithm has to be repeated to return to solved: 2 for
   * every swap-shaped case, 3 for the three-cycles. Pins the shape of the
   * permutation rather than only its size.
   */
  order: 2 | 3
  /** Which 2-look PLL step teaches this case, or `null` if it is full-PLL only. */
  twoLook: PllTwoLookStep | null
}
