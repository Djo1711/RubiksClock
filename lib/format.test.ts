import { describe, expect, it } from 'vitest'
import { formatCountdown, formatMs, formatResult } from './format'

describe('formatMs', () => {
  it('formats sub-minute times without a leading zero', () => {
    expect(formatMs(9_870)).toBe('9.87')
  })

  it('pads hundredths', () => {
    expect(formatMs(9_800)).toBe('9.80')
    expect(formatMs(9_805)).toBe('9.80')
  })

  it('truncates rather than rounds, like a Stackmat display', () => {
    expect(formatMs(9_879)).toBe('9.87')
  })

  it('formats minutes with padded seconds', () => {
    expect(formatMs(62_340)).toBe('1:02.34')
  })

  it('formats a whole minute', () => {
    expect(formatMs(60_000)).toBe('1:00.00')
  })

  it('clamps negatives to zero', () => {
    expect(formatMs(-500)).toBe('0.00')
  })
})

describe('formatResult', () => {
  it('renders an unpenalised solve as its raw time', () => {
    expect(formatResult(12_340, 'none')).toBe('12.34')
  })

  it('renders a plus2 as the penalised time with a marker', () => {
    expect(formatResult(12_340, 'plus2')).toBe('14.34+')
  })

  it('renders a dnf as DNF', () => {
    expect(formatResult(12_340, 'dnf')).toBe('DNF')
  })
})

describe('formatCountdown', () => {
  it('shows whole seconds remaining, rounded up', () => {
    expect(formatCountdown(14_100)).toBe('15')
    expect(formatCountdown(8_001)).toBe('9')
  })

  it('clamps to zero once the inspection time is spent', () => {
    expect(formatCountdown(-2_400)).toBe('0')
  })
})
