import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { I18nProvider } from '@/components/i18n-provider'
import { ScrambleBar } from './scramble-bar'

vi.mock('@/components/scramble/cube-preview', () => ({
  CubePreview: () => <div data-testid="cube-preview" />,
}))

function renderBar(props: Partial<Parameters<typeof ScrambleBar>[0]> = {}) {
  return render(
    <I18nProvider>
      <ScrambleBar scramble="" loading={false} error={false} onRefresh={() => {}} {...props} />
    </I18nProvider>,
  )
}

describe('ScrambleBar', () => {
  beforeEach(() => {
    window.localStorage.clear()
    vi.spyOn(navigator, 'language', 'get').mockReturnValue('en-US')
  })

  afterEach(() => {
    vi.restoreAllMocks()
    window.localStorage.clear()
  })

  it('shows the loading text and disables the button while loading', () => {
    renderBar({ loading: true })
    expect(screen.getByText('Generating scramble…')).not.toBeNull()
    const button = screen.getByRole('button', { name: 'New scramble' }) as HTMLButtonElement
    expect(button.disabled).toBe(true)
  })

  it('shows the error text and keeps the button enabled so the user can retry', () => {
    renderBar({ error: true, scramble: "R U R' U'" })
    expect(screen.getByText('Could not generate a scramble. Try again.')).not.toBeNull()
    const button = screen.getByRole('button', { name: 'New scramble' }) as HTMLButtonElement
    expect(button.disabled).toBe(false)
  })

  it('shows the scramble text and keeps the button enabled once one is available', () => {
    renderBar({ scramble: "R U R' U'" })
    expect(screen.getByText("R U R' U'")).not.toBeNull()
    const button = screen.getByRole('button', { name: 'New scramble' }) as HTMLButtonElement
    expect(button.disabled).toBe(false)
  })
})
