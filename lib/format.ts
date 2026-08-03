import { effectiveMs, type Penalty } from '@/lib/timer/penalties'

function pad2(value: number): string {
  return value.toString().padStart(2, '0')
}

/**
 * Milliseconds as a competition-style time, truncated to hundredths the way a
 * Stackmat display truncates: 9.879 s reads as 9.87.
 */
export function formatMs(ms: number): string {
  const total = Math.max(0, Math.trunc(ms))
  const hundredths = Math.floor(total / 10) % 100
  const seconds = Math.floor(total / 1_000) % 60
  const minutes = Math.floor(total / 60_000)
  return minutes > 0
    ? `${minutes}:${pad2(seconds)}.${pad2(hundredths)}`
    : `${seconds}.${pad2(hundredths)}`
}

/** A finished solve, penalty included. */
export function formatResult(rawMs: number, penalty: Penalty): string {
  const effective = effectiveMs(rawMs, penalty)
  if (effective === null) return 'DNF'
  return penalty === 'plus2' ? `${formatMs(effective)}+` : formatMs(effective)
}

/** Whole seconds left in the inspection, never negative. */
export function formatCountdown(remainingMs: number): string {
  return Math.max(0, Math.ceil(remainingMs / 1_000)).toString()
}
