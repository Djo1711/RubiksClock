import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { I18nProvider } from '@/components/i18n-provider'
import { ScrambleBar } from './scramble-bar'

// Stubbed so these tests are about the bar's own logic — which of the three
// texts it shows, and whether the cube is there at all. The net's own geometry
// is proven in lib/cube/facelets.test.ts.
vi.mock('@/components/scramble/cube-net', () => ({
  CubeNet: () => <div data-testid="cube-net" />,
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

  it('does not draw the cube in the error state, where the scramble is stale', () => {
    renderBar({ error: true, scramble: "R U R' U'" })
    expect(screen.queryByTestId('cube-net')).toBeNull()
  })

  it('does not draw the cube before the first scramble arrives', () => {
    renderBar({ loading: true })
    expect(screen.queryByTestId('cube-net')).toBeNull()
  })

  it('shows the scramble text and keeps the button enabled once one is available', () => {
    renderBar({ scramble: "R U R' U'" })
    expect(screen.getByText("R U R' U'")).not.toBeNull()
    const button = screen.getByRole('button', { name: 'New scramble' }) as HTMLButtonElement
    expect(button.disabled).toBe(false)
  })

  it('draws the cube once a scramble is available', () => {
    renderBar({ scramble: "R U R' U'" })
    expect(screen.getByTestId('cube-net')).not.toBeNull()
  })
})
