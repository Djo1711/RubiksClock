import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { I18nProvider } from '@/components/i18n-provider'
import { defaultSettings } from '@/lib/settings'
import { KEY_MAPS } from '@/lib/timer/machine'
import { keyLabel } from '@/components/timer/key-hints'
import { SettingsDialog } from './settings-dialog'

function renderDialog(onChange: (settings: typeof defaultSettings) => void) {
  return render(
    <I18nProvider>
      <SettingsDialog settings={defaultSettings} onChange={onChange} />
    </I18nProvider>,
  )
}

describe('SettingsDialog key capture', () => {
  beforeEach(() => {
    window.localStorage.clear()
    vi.spyOn(navigator, 'language', 'get').mockReturnValue('en-US')
  })

  afterEach(() => {
    vi.restoreAllMocks()
    window.localStorage.clear()
  })

  it('refuses a code already bound to another slot, and accepts an unused one', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    renderDialog(onChange)

    await user.click(screen.getByRole('button', { name: 'Settings' }))
    // Enter capture mode on the second slot, whatever the default map is.
    await user.click(screen.getByRole('button', { name: keyLabel(defaultSettings.keys[1]) }))
    expect(screen.getByRole('button', { name: '…' })).not.toBeNull()

    // The first slot's code is already bound: refused, capture stays open.
    window.dispatchEvent(
      new KeyboardEvent('keydown', {
        code: defaultSettings.keys[0],
        bubbles: true,
        cancelable: true,
      }),
    )
    expect(onChange).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: '…' })).not.toBeNull()

    // KeyX is unused: accepted, and onChange receives the map with that one slot
    // replaced and every other slot untouched.
    window.dispatchEvent(
      new KeyboardEvent('keydown', { code: 'KeyX', bubbles: true, cancelable: true }),
    )
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith({
      ...defaultSettings,
      keys: defaultSettings.keys.map((key, index) => (index === 1 ? 'KeyX' : key)),
    })
  })

  it.each(['Space', 'Tab', 'Enter'])(
    'refuses %s, which would produce an unusable binding, and keeps capture open',
    async (code) => {
      const onChange = vi.fn()
      const user = userEvent.setup()
      renderDialog(onChange)

      await user.click(screen.getByRole('button', { name: 'Settings' }))
      await user.click(screen.getByRole('button', { name: keyLabel(defaultSettings.keys[1]) }))
      expect(screen.getByRole('button', { name: '…' })).not.toBeNull()

      window.dispatchEvent(
        new KeyboardEvent('keydown', { code, bubbles: true, cancelable: true }),
      )
      expect(onChange).not.toHaveBeenCalled()
      expect(screen.getByRole('button', { name: '…' })).not.toBeNull()
    },
  )
})

describe('SettingsDialog keys per hand', () => {
  beforeEach(() => {
    window.localStorage.clear()
    vi.spyOn(navigator, 'language', 'get').mockReturnValue('en-US')
  })

  afterEach(() => {
    vi.restoreAllMocks()
    window.localStorage.clear()
  })

  // Many keyboards cannot report six keys at once, so the count is the fix for
  // ghosting: picking 1 must hand back the two-key map, not merely trim.
  it('replaces the map with the chosen count, one key per hand', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    renderDialog(onChange)

    await user.click(screen.getByRole('button', { name: 'Settings' }))
    await user.click(screen.getByRole('button', { name: '1' }))

    expect(onChange).toHaveBeenCalledWith({ ...defaultSettings, keys: [...KEY_MAPS[1]] })
    expect(KEY_MAPS[1]).toHaveLength(2)
  })

  it('marks the count matching the current map', async () => {
    const user = userEvent.setup()
    renderDialog(vi.fn())

    await user.click(screen.getByRole('button', { name: 'Settings' }))

    // The default map is two per hand.
    expect(screen.getByRole('button', { name: '2' }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByRole('button', { name: '1' }).getAttribute('aria-pressed')).toBe('false')
  })

  it('counts keys held at once and remembers the maximum', async () => {
    const user = userEvent.setup()
    renderDialog(vi.fn())

    await user.click(screen.getByRole('button', { name: 'Settings' }))

    // act() so the counter's state updates flush before we read the rendered
    // numbers; these are real window events, not React synthetic ones.
    const press = (code: string) =>
      act(() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { code, bubbles: true }))
      })
    const release = (code: string) =>
      act(() => {
        window.dispatchEvent(new KeyboardEvent('keyup', { code, bubbles: true }))
      })

    press('KeyA')
    press('KeyB')
    press('KeyC')
    expect(screen.getByTestId('keys-held-now').textContent).toBe('3')
    expect(screen.getByTestId('keys-held-max').textContent).toBe('3')

    // Releasing lowers the live count but never the maximum: that maximum is
    // what tells the user how many keys their keyboard can actually report.
    release('KeyC')
    release('KeyB')
    expect(screen.getByTestId('keys-held-now').textContent).toBe('1')
    expect(screen.getByTestId('keys-held-max').textContent).toBe('3')

    await user.click(screen.getByRole('button', { name: 'Reset' }))
    expect(screen.getByTestId('keys-held-max').textContent).toBe('0')
  })
})
