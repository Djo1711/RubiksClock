import type { PllCase } from './types'

/**
 * The 21 PLL cases: every way the last layer can be misplaced once it is
 * oriented, each with the standard algorithm that permutes it home.
 *
 * The letter names are the identity of a case and are universal. Ordered by
 * family — the four that move only edges, the three that move only corners, then
 * the fourteen that move both — and alphabetically within each, which is how
 * every PLL sheet is laid out.
 *
 * ## 2-look PLL
 *
 * `twoLook` follows the usual convention: permute the corners first, then the
 * edges. The corner step is the three cases that move corners alone — Aa, Ab and
 * E — and the edge step is the four that move edges alone — Ua, Ub, Z and H.
 * Seven algorithms in total, all of them full-PLL cases too, so nothing learnt
 * for 2-look is thrown away later.
 *
 * ## Algorithms
 *
 * Standard, widely used, finger-friendly algorithms, none of which leaves a net
 * whole-cube rotation. Each is written so that it carries no stray last-layer
 * turn either: applied to a solved cube it produces exactly its own
 * permutation and nothing else, which is what makes `movedCorners`, `movedEdges`
 * and `order` mean anything. Several common write-ups leave the last quarter
 * turn to the solver — the four G perms and Rb below end in the turn that
 * finishes the job, so that the case each one is filed under is the case a
 * figure derived from it will show.
 */
export const PLL_CASES: readonly PllCase[] = [
  {
    name: 'Ua',
    family: 'edge-only',
    algorithm: "M2 U M U2 M' U M2",
    movedCorners: 0,
    movedEdges: 3,
    order: 3,
    twoLook: 'edge-permutation',
  },
  {
    name: 'Ub',
    family: 'edge-only',
    algorithm: "M2 U' M U2 M' U' M2",
    movedCorners: 0,
    movedEdges: 3,
    order: 3,
    twoLook: 'edge-permutation',
  },
  {
    name: 'Z',
    family: 'edge-only',
    algorithm: "M2 U M2 U M' U2 M2 U2 M' U2",
    movedCorners: 0,
    movedEdges: 4,
    order: 2,
    twoLook: 'edge-permutation',
  },
  {
    name: 'H',
    family: 'edge-only',
    algorithm: 'M2 U M2 U2 M2 U M2',
    movedCorners: 0,
    movedEdges: 4,
    order: 2,
    twoLook: 'edge-permutation',
  },
  {
    name: 'Aa',
    family: 'corner-only',
    algorithm: "R' F R' B2 R F' R' B2 R2",
    movedCorners: 3,
    movedEdges: 0,
    order: 3,
    twoLook: 'corner-permutation',
  },
  {
    name: 'Ab',
    family: 'corner-only',
    algorithm: "R2 B2 R F R' B2 R F' R",
    movedCorners: 3,
    movedEdges: 0,
    order: 3,
    twoLook: 'corner-permutation',
  },
  {
    name: 'E',
    family: 'corner-only',
    algorithm: "R B' R' F R B R' F' R B R' F R B' R' F'",
    movedCorners: 4,
    movedEdges: 0,
    order: 2,
    twoLook: 'corner-permutation',
  },
  {
    name: 'F',
    family: 'both',
    algorithm: "R' U' F' R U R' U' R' F R2 U' R' U' R U R' U R",
    movedCorners: 2,
    movedEdges: 2,
    order: 2,
    twoLook: null,
  },
  {
    name: 'Ga',
    family: 'both',
    algorithm: "R2 U R' U R' U' R U' R2 U' D R' U R D' U",
    movedCorners: 3,
    movedEdges: 3,
    order: 3,
    twoLook: null,
  },
  {
    name: 'Gb',
    family: 'both',
    algorithm: "R' U' R U D' R2 U R' U R U' R U' R2 D U",
    movedCorners: 3,
    movedEdges: 3,
    order: 3,
    twoLook: null,
  },
  {
    name: 'Gc',
    family: 'both',
    algorithm: "R2 U' R U' R U R' U R2 U D' R U' R' D U",
    movedCorners: 3,
    movedEdges: 3,
    order: 3,
    twoLook: null,
  },
  {
    name: 'Gd',
    family: 'both',
    algorithm: "R U R' U' D R2 U' R U' R' U R' U R2 D' U",
    movedCorners: 3,
    movedEdges: 3,
    order: 3,
    twoLook: null,
  },
  {
    name: 'Ja',
    family: 'both',
    algorithm: "L U' R' U L' U2 R U' R' U2 R",
    movedCorners: 2,
    movedEdges: 2,
    order: 2,
    twoLook: null,
  },
  {
    name: 'Jb',
    family: 'both',
    algorithm: "R U R' F' R U R' U' R' F R2 U' R' U'",
    movedCorners: 2,
    movedEdges: 2,
    order: 2,
    twoLook: null,
  },
  {
    name: 'Na',
    family: 'both',
    algorithm: "R U R' U R U R' F' R U R' U' R' F R2 U' R' U2 R U' R'",
    movedCorners: 2,
    movedEdges: 2,
    order: 2,
    twoLook: null,
  },
  {
    name: 'Nb',
    family: 'both',
    algorithm: "R' U R U' R' F' U' F R U R' F R' F' R U' R",
    movedCorners: 2,
    movedEdges: 2,
    order: 2,
    twoLook: null,
  },
  {
    name: 'Ra',
    family: 'both',
    algorithm: "R U R' F' R U2 R' U2 R' F R U R U2 R' U'",
    movedCorners: 2,
    movedEdges: 2,
    order: 2,
    twoLook: null,
  },
  {
    name: 'Rb',
    family: 'both',
    algorithm: "R' U2 R U2 R' F R U R' U' R' F' R2 U'",
    movedCorners: 2,
    movedEdges: 2,
    order: 2,
    twoLook: null,
  },
  {
    name: 'T',
    family: 'both',
    algorithm: "R U R' U' R' F R2 U' R' U' R U R' F'",
    movedCorners: 2,
    movedEdges: 2,
    order: 2,
    twoLook: null,
  },
  {
    name: 'V',
    family: 'both',
    algorithm: "R' U R' U' R D' R' D R' U D' R2 U' R2 D R2",
    movedCorners: 2,
    movedEdges: 2,
    order: 2,
    twoLook: null,
  },
  {
    name: 'Y',
    family: 'both',
    algorithm: "F R U' R' U' R U R' F' R U R' U' R' F R F'",
    movedCorners: 2,
    movedEdges: 2,
    order: 2,
    twoLook: null,
  },
]

/** The seven cases that make up 2-look PLL, in the order they are learnt. */
export const TWO_LOOK_PLL_CASES: readonly PllCase[] = PLL_CASES.filter((entry) => entry.twoLook)
