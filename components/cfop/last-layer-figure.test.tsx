import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { LastLayerFigure, lastLayerStickers, type LastLayerMode } from './last-layer-figure'
import { OLL_CASES, PLL_CASES } from '@/lib/cfop'
import { FACE_COLOUR } from '@/lib/cube/colours'
import { LAST_LAYER } from './last-layer-figure'
import type { Facelet } from '@/lib/cube/facelets'

/**
 * The four last-layer edges as the figure draws them: the U cell, and the tab
 * that lies against it. The cells are the four sides of the 3x3, and the tabs
 * are the middle one of each side, going round from the back.
 */
const FIGURE_EDGES = [
  { cell: 1, tab: 1 },
  { cell: 5, tab: 4 },
  { cell: 7, tab: 7 },
  { cell: 3, tab: 10 },
]

/**
 * The four last-layer corners as the figure draws them: the U cell, and the two
 * tabs that meet at it. Going round from the back left, each corner takes the
 * end tab of one side and the end tab of the side next to it.
 */
const FIGURE_CORNERS = [
  { cell: 0, tabs: [0, 9] },
  { cell: 2, tabs: [2, 3] },
  { cell: 8, tabs: [5, 8] },
  { cell: 6, tabs: [6, 11] },
]

/** The sticker sets of the four real last-layer edges, sorted so a set is one string. */
const REAL_EDGES = ['BU', 'FU', 'LU', 'RU']

/** The sticker sets of the four real last-layer corners, in the same form. */
const REAL_CORNERS = ['BLU', 'BRU', 'FLU', 'FRU']

/** A set of stickers as one comparable string, independent of how it is twisted. */
function pieceOf(stickers: Facelet[]): string {
  return [...stickers].sort().join('')
}

/** Every case in both tables, as the algorithm to draw and a name to report. */
const EVERY_CASE = [
  ...OLL_CASES.map((entry) => ({ label: `OLL ${entry.id}`, algorithm: entry.algorithm })),
  ...PLL_CASES.map((entry) => ({ label: `PLL ${entry.name}`, algorithm: entry.algorithm })),
]

/** The rects of the 3x3 and the rects of the twelve tabs, in drawing order. */
function figureRects(algorithm: string, mode: LastLayerMode) {
  const { container, unmount } = render(<LastLayerFigure algorithm={algorithm} mode={mode} />)
  const svg = container.querySelector('svg')!
  const groups = svg.querySelectorAll(':scope > g')
  const fills = (group: Element) =>
    [...group.querySelectorAll('rect')].map((rect) => rect.getAttribute('fill'))
  const result = { svg, cells: fills(groups[0]), tabs: fills(groups[1]) }
  unmount()
  return result
}

describe('lastLayerStickers', () => {
  it('reads a solved last layer as a whole U face ringed by its own four colours', () => {
    const { cells, tabs } = lastLayerStickers('')
    expect(cells).toEqual(Array.from({ length: 9 }, () => 'U'))
    expect(tabs).toEqual(['B', 'B', 'B', 'R', 'R', 'R', 'F', 'F', 'F', 'L', 'L', 'L'])
  })

  it('puts a real last-layer piece at every position of every case', () => {
    // The adjacency check: each U cell and the tabs beside it belong to one
    // cubie, so their stickers have to be the stickers of a piece that exists.
    // Mis-order one side's tabs and this pairs stickers no real piece carries.
    for (const { label, algorithm } of EVERY_CASE) {
      const { cells, tabs } = lastLayerStickers(algorithm)
      for (const { cell, tab } of FIGURE_EDGES) {
        expect(REAL_EDGES, `${label}, edge at cell ${cell}`).toContain(
          pieceOf([cells[cell], tabs[tab]]),
        )
      }
      for (const { cell, tabs: corner } of FIGURE_CORNERS) {
        expect(REAL_CORNERS, `${label}, corner at cell ${cell}`).toContain(
          pieceOf([cells[cell], ...corner.map((index) => tabs[index])]),
        )
      }
    }
  })
})

describe('LastLayerFigure', () => {
  it('draws nine cells and twelve tabs, and hides them from assistive technology', () => {
    const { svg, cells, tabs } = figureRects("R U R' U R U2 R'", 'orientation')
    expect(svg.getAttribute('aria-hidden')).toBe('true')
    expect(cells).toHaveLength(9)
    expect(tabs).toHaveLength(12)
  })

  it('shows exactly the oriented stickers of every OLL case', () => {
    // The centre always points up, so the U-coloured cells of an OLL figure are
    // the centre plus the corners and edges the table records as oriented. This
    // is the picture and the metadata checked against each other.
    for (const entry of OLL_CASES) {
      const { cells } = figureRects(entry.algorithm, 'orientation')
      const oriented = cells.filter((fill) => fill === LAST_LAYER)
      expect(oriented, `OLL ${entry.id}`).toHaveLength(
        1 + entry.orientedCorners + entry.orientedEdges,
      )
    }
  })

  it('draws an OLL figure in two colours only', () => {
    for (const entry of OLL_CASES) {
      const { cells, tabs } = figureRects(entry.algorithm, 'orientation')
      for (const fill of [...cells, ...tabs]) {
        expect([LAST_LAYER, 'var(--muted)'], `OLL ${entry.id}`).toContain(fill)
      }
    }
  })

  it('shows every PLL case as a solved face, in the real colours of its sides', () => {
    for (const entry of PLL_CASES) {
      const { cells, tabs } = figureRects(entry.algorithm, 'permutation')
      expect(cells, `PLL ${entry.name}`).toEqual(Array.from({ length: 9 }, () => LAST_LAYER))
      expect(tabs, `PLL ${entry.name}`).toEqual(
        lastLayerStickers(entry.algorithm).tabs.map((sticker) => FACE_COLOUR[sticker]),
      )
      // A permutation moves the last layer's pieces about without taking any
      // off it, so the twelve tabs are always three of each side colour.
      expect(tabs.filter((fill) => fill === FACE_COLOUR.R), `PLL ${entry.name}`).toHaveLength(3)
    }
  })
})
