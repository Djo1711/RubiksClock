import { describe, expect, it } from 'vitest'
import { dictionaries, locales } from './dictionaries'

describe('dictionaries', () => {
  it('covers every locale', () => {
    expect(Object.keys(dictionaries).sort()).toEqual([...locales].sort())
  })

  it('defines the same keys in every locale, with no empty string', () => {
    const reference = Object.keys(dictionaries.fr).sort()
    for (const locale of locales) {
      expect(Object.keys(dictionaries[locale]).sort()).toEqual(reference)
      for (const [key, value] of Object.entries(dictionaries[locale])) {
        expect(value, `${locale}.${key}`).not.toBe('')
      }
    }
  })
})
