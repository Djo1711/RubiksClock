import { describe, expect, it } from 'vitest'
import { CUES, dueCues } from './cues'

describe('dueCues', () => {
  it('is empty below the first threshold', () => {
    expect(dueCues(0, new Set())).toEqual([])
    expect(dueCues(7_999, new Set())).toEqual([])
  })

  it('yields only the 8s cue when crossing it', () => {
    expect(dueCues(8_000, new Set())).toEqual([8_000])
    expect(dueCues(9_000, new Set())).toEqual([8_000])
  })

  it('yields nothing on a repeat call once a cue has already fired', () => {
    expect(dueCues(9_000, new Set([8_000]))).toEqual([])
  })

  it('yields only the 12s cue when crossing it with the 8s cue already fired', () => {
    expect(dueCues(12_500, new Set([8_000]))).toEqual([12_000])
  })

  it('yields nothing once both cues have fired', () => {
    expect(dueCues(20_000, new Set(CUES))).toEqual([])
  })

  it('yields both cues at once when a single frame jumps past both thresholds', () => {
    expect(dueCues(13_000, new Set())).toEqual([8_000, 12_000])
  })
})
