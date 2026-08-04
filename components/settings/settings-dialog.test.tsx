import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { I18nProvider } from '@/components/i18n-provider'
import { defaultSettings } from '@/lib/settings'
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
    // Default keys are Q Z D / L I J (DEFAULT_KEYS); enter capture mode on
    // the second slot (Z).
    await user.click(screen.getByRole('button', { name: 'Z' }))
    expect(screen.getByRole('button', { name: '…' })).not.toBeNull()

    // KeyQ is already bound to the first slot: refused, capture stays open.
    window.dispatchEvent(
      new KeyboardEvent('keydown', { code: 'KeyQ', bubbles: true, cancelable: true }),
    )
    expect(onChange).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: '…' })).not.toBeNull()

    // KeyX is unused: accepted, and onChange receives the updated six-key map.
    window.dispatchEvent(
      new KeyboardEvent('keydown', { code: 'KeyX', bubbles: true, cancelable: true }),
    )
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith({
      ...defaultSettings,
      keys: ['KeyQ', 'KeyX', 'KeyD', 'KeyL', 'KeyI', 'KeyJ'],
    })
  })

  it.each(['Space', 'Tab', 'Enter'])(
    'refuses %s, which would produce an unusable binding, and keeps capture open',
    async (code) => {
      const onChange = vi.fn()
      const user = userEvent.setup()
      renderDialog(onChange)

      await user.click(screen.getByRole('button', { name: 'Settings' }))
      await user.click(screen.getByRole('button', { name: 'Z' }))
      expect(screen.getByRole('button', { name: '…' })).not.toBeNull()

      window.dispatchEvent(
        new KeyboardEvent('keydown', { code, bubbles: true, cancelable: true }),
      )
      expect(onChange).not.toHaveBeenCalled()
      expect(screen.getByRole('button', { name: '…' })).not.toBeNull()
    },
  )
})
