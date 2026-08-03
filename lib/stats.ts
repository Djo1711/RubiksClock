import { effectiveMs, type Penalty } from '@/lib/timer/penalties'

export type Attempt = { rawMs: number; penalty: Penalty }

export type SessionStats = {
  count: number
  best: number | null
  worst: number | null
  mo3: number | null
  ao5: number | null
  ao12: number | null
  sessionMean: number | null
}

/** WCA 9f2: results are expressed to the nearest hundredth of a second. */
function roundToHundredth(ms: number): number {
  return Math.round(ms / 10) * 10
}

function times(attempts: Attempt[]): (number | null)[] {
  return attempts.map((attempt) => effectiveMs(attempt.rawMs, attempt.penalty))
}

/** The mean of every attempt, or null if any of them is a DNF. */
export function mean(attempts: Attempt[]): number | null {
  if (attempts.length === 0) return null
  const values = times(attempts)
  if (values.some((value) => value === null)) return null
  const total = (values as number[]).reduce((sum, value) => sum + value, 0)
  return roundToHundredth(total / values.length)
}

/**
 * The WCA average: drop the best and the worst, mean the rest. A DNF sorts as
 * the worst attempt, so one DNF is absorbed and two make the average a DNF.
 */
export function trimmedAverage(attempts: Attempt[]): number | null {
  if (attempts.length < 3) return null
  const values = times(attempts)
  if (values.filter((value) => value === null).length >= 2) return null
  const sorted = values
    .map((value) => (value === null ? Number.POSITIVE_INFINITY : value))
    .sort((a, b) => a - b)
  const middle = sorted.slice(1, -1)
  const total = middle.reduce((sum, value) => sum + value, 0)
  return roundToHundredth(total / middle.length)
}

/** `attempts` is chronological, oldest first. */
export function sessionStats(attempts: Attempt[]): SessionStats {
  const solved = times(attempts).filter((value): value is number => value !== null)
  return {
    count: attempts.length,
    best: solved.length > 0 ? Math.min(...solved) : null,
    worst: solved.length > 0 ? Math.max(...solved) : null,
    mo3: attempts.length >= 3 ? mean(attempts.slice(-3)) : null,
    ao5: attempts.length >= 5 ? trimmedAverage(attempts.slice(-5)) : null,
    ao12: attempts.length >= 12 ? trimmedAverage(attempts.slice(-12)) : null,
    sessionMean:
      solved.length > 0
        ? roundToHundredth(solved.reduce((sum, value) => sum + value, 0) / solved.length)
        : null,
  }
}
