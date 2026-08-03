import { afterEach, describe, expect, it, vi } from 'vitest'
import { createCubingScrambleProvider } from './cubing-provider'

describe('createCubingScrambleProvider', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('requests the scramble route for the given puzzle and returns the scramble', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({ scramble: "R U R' U'" }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const provider = createCubingScrambleProvider()
    await expect(provider.next('3x3')).resolves.toBe("R U R' U'")

    expect(fetchMock).toHaveBeenCalledWith('/api/scramble?puzzle=3x3', { cache: 'no-store' })
  })

  it('throws instead of returning an empty scramble when the request fails', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      json: async () => ({}),
    })
    vi.stubGlobal('fetch', fetchMock)

    const provider = createCubingScrambleProvider()
    await expect(provider.next('3x3')).rejects.toThrow()
  })
})
