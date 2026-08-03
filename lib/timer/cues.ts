/** WCA A3b1 and A3b2: the judge warns at 8 and at 12 seconds. */
export const CUES = [8_000, 12_000] as const

/**
 * Given the inspection time elapsed and the set of thresholds already fired
 * this inspection, returns the thresholds that are newly due — crossed but
 * not yet fired. Pure and free of React/DOM so the fired-once-per-inspection
 * guarantee can be tested directly: a frame that jumps past several
 * thresholds at once (e.g. after a tab was backgrounded) returns all of them.
 */
export function dueCues(
  inspectionElapsedMs: number,
  fired: ReadonlySet<number>,
): (typeof CUES)[number][] {
  return CUES.filter(
    (threshold) => inspectionElapsedMs >= threshold && !fired.has(threshold),
  )
}
