import { describe, expect, it } from 'vitest'
import { mean, sessionStats, trimmedAverage, type Attempt } from './stats'

const ok = (rawMs: number): Attempt => ({ rawMs, penalty: 'none' })
const dnf = (rawMs: number): Attempt => ({ rawMs, penalty: 'dnf' })
const plus2 = (rawMs: number): Attempt => ({ rawMs, penalty: 'plus2' })

describe('mean', () => {
  it('averages the effective times', () => {
    expect(mean([ok(10_000), ok(12_000), ok(14_000)])).toBe(12_000)
  })

  it('counts the +2 in the effective time', () => {
    // Effective times are 10 000, 10 000 and 12 000: a mean of 10 666.67 ms,
    // which rounds to the nearest hundredth as 10 670 ms.
    expect(mean([ok(10_000), ok(10_000), plus2(10_000)])).toBe(10_670)
  })

  it('is a DNF as soon as one attempt is a DNF', () => {
    expect(mean([ok(10_000), ok(12_000), dnf(14_000)])).toBeNull()
  })

  it('is null for an empty list', () => {
    expect(mean([])).toBeNull()
  })

  it('rounds to the nearest hundredth', () => {
    expect(mean([ok(10_000), ok(10_000), ok(10_007)])).toBe(10_000)
    expect(mean([ok(10_000), ok(10_000), ok(10_020)])).toBe(10_010)
  })
})

describe('trimmedAverage', () => {
  it('drops the best and the worst', () => {
    expect(trimmedAverage([ok(8_000), ok(10_000), ok(12_000), ok(14_000), ok(30_000)])).toBe(
      12_000,
    )
  })

  it('treats a single DNF as the dropped worst', () => {
    expect(trimmedAverage([ok(8_000), ok(10_000), ok(12_000), ok(14_000), dnf(9_000)])).toBe(
      12_000,
    )
  })

  it('is a DNF with two or more DNFs', () => {
    expect(
      trimmedAverage([ok(8_000), ok(10_000), ok(12_000), dnf(14_000), dnf(9_000)]),
    ).toBeNull()
  })

  it('is null below three attempts', () => {
    expect(trimmedAverage([ok(8_000), ok(10_000)])).toBeNull()
  })
})

describe('sessionStats', () => {
  it('reports zeroes for an empty session', () => {
    expect(sessionStats([])).toEqual({
      count: 0,
      best: null,
      worst: null,
      mo3: null,
      ao5: null,
      ao12: null,
      sessionMean: null,
    })
  })

  it('reports the best and worst effective times, ignoring DNFs', () => {
    const stats = sessionStats([ok(15_000), ok(9_000), dnf(3_000)])
    expect(stats.best).toBe(9_000)
    expect(stats.worst).toBe(15_000)
    expect(stats.count).toBe(3)
  })

  it('computes mo3 and ao5 over the most recent attempts', () => {
    const attempts = [ok(30_000), ok(8_000), ok(10_000), ok(12_000), ok(14_000), ok(20_000)]
    expect(sessionStats(attempts).mo3).toBe(mean(attempts.slice(-3)))
    expect(sessionStats(attempts).ao5).toBe(trimmedAverage(attempts.slice(-5)))
  })

  it('leaves ao12 null until twelve attempts exist', () => {
    expect(sessionStats(Array.from({ length: 11 }, () => ok(10_000))).ao12).toBeNull()
    expect(sessionStats(Array.from({ length: 12 }, () => ok(10_000))).ao12).toBe(10_000)
  })

  it('excludes DNFs from the session mean', () => {
    expect(sessionStats([ok(10_000), ok(14_000), dnf(5_000)]).sessionMean).toBe(12_000)
  })
})
