/** WCA A3a: inspection is 15 seconds. */
export const INSPECTION_MS = 15_000

/** WCA A3c2: starting the solve past 17 seconds of inspection is a DNF. */
export const INSPECTION_PLUS2_LIMIT_MS = 17_000

/** WCA A3c1: the penalty for exceeding the inspection time. */
export const PLUS2_MS = 2_000

export type Penalty = 'none' | 'plus2' | 'dnf'

/**
 * The penalty incurred by the inspection time elapsed at the moment the solve
 * started. Exceeding 15 s is +2 (A3c1); exceeding 17 s is a DNF (A3c2).
 */
export function inspectionPenalty(inspectionMs: number): Penalty {
  if (inspectionMs > INSPECTION_PLUS2_LIMIT_MS) return 'dnf'
  if (inspectionMs > INSPECTION_MS) return 'plus2'
  return 'none'
}

/** The comparable time for a solve, or null when it does not have one (DNF). */
export function effectiveMs(rawMs: number, penalty: Penalty): number | null {
  if (penalty === 'dnf') return null
  return penalty === 'plus2' ? rawMs + PLUS2_MS : rawMs
}
