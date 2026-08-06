/**
 * The CFOP last-layer tables: 57 OLL cases and 21 PLL cases as pure data, with
 * the recognition metadata a reference page needs to group and label them.
 *
 * Every algorithm here is checked by `cfop.test.ts` against the cube engine in
 * `lib/cube/facelets.ts`: it must leave the first two layers and all six centres
 * untouched, it must actually solve the case it is filed under, and the
 * orientation and permutation metadata beside it must match what the algorithm
 * really does.
 */

export { OLL_CASES, TWO_LOOK_OLL_CASES } from './oll'
export { PLL_CASES, TWO_LOOK_PLL_CASES } from './pll'
export {
  OLL_FAMILIES,
  PLL_FAMILIES,
  type OllCase,
  type OllFamily,
  type OllTwoLookStep,
  type OrientedCount,
  type PllCase,
  type PllFamily,
  type PllTwoLookStep,
} from './types'
