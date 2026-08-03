import { describe, expect, it } from 'vitest'
import { createStaticScrambleProvider } from './types'

describe('createStaticScrambleProvider', () => {
  it('cycles through the supplied scrambles', async () => {
    const provider = createStaticScrambleProvider(["R U R'", "L D L'"])
    await expect(provider.next('3x3')).resolves.toBe("R U R'")
    await expect(provider.next('3x3')).resolves.toBe("L D L'")
    await expect(provider.next('3x3')).resolves.toBe("R U R'")
  })

  it('rejects an empty list rather than returning an empty scramble', () => {
    expect(() => createStaticScrambleProvider([])).toThrow()
  })
})
