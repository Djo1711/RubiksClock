import { describe, expect, it } from 'vitest'
import { effectiveMs, inspectionPenalty } from './penalties'

// @vitest-environment node

describe('inspectionPenalty', () => {
  it('returns none well inside the 15 second limit', () => {
    expect(inspectionPenalty(9_000)).toBe('none')
  })

  it('returns none at exactly 15 seconds (A3c1 penalises exceeding it)', () => {
    expect(inspectionPenalty(15_000)).toBe('none')
  })

  it('returns plus2 one millisecond past 15 seconds', () => {
    expect(inspectionPenalty(15_001)).toBe('plus2')
  })

  it('returns plus2 at exactly 17 seconds', () => {
    expect(inspectionPenalty(17_000)).toBe('plus2')
  })

  it('returns dnf one millisecond past 17 seconds', () => {
    expect(inspectionPenalty(17_001)).toBe('dnf')
  })
})

describe('effectiveMs', () => {
  it('leaves an unpenalised time untouched', () => {
    expect(effectiveMs(12_340, 'none')).toBe(12_340)
  })

  it('adds two seconds for plus2', () => {
    expect(effectiveMs(12_340, 'plus2')).toBe(14_340)
  })

  it('returns null for dnf', () => {
    expect(effectiveMs(12_340, 'dnf')).toBeNull()
  })
})
