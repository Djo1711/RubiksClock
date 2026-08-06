import { FACE_COLOUR } from '@/lib/cube/colours'
import { applyScramble, FACES, invertAlgorithm, type Face, type Facelet } from '@/lib/cube/facelets'

/**
 * How a figure colours its stickers.
 *
 * `orientation` is the OLL picture: every sticker is either the U colour — it
 * points up, or sideways for a tab — or dark. `permutation` is the PLL picture:
 * the U face is uniformly the U colour, and the tabs carry their real face
 * colours, which is what shows where each piece has to go.
 */
export type LastLayerMode = 'orientation' | 'permutation'

/** Where each face sits in a {@link import('@/lib/cube/facelets').CubeState}. */
const FACE_INDEX = Object.fromEntries(FACES.map((face, index) => [face, index])) as Record<
  Face,
  number
>

/**
 * The twelve side stickers the figure shows around the U face, as the face each
 * lies on and its row-major index within that face.
 *
 * Every one is on its face's top row, the row that touches U. The order is the
 * order they are read in the drawing: the back edge left to right, then the
 * right edge top to bottom, then the front edge left to right, then the left
 * edge top to bottom.
 *
 * Which end of a top row is which follows the facelet convention of
 * `lib/cube/facelets.ts`. Looking down at U with B at the top of the drawing:
 * B's column 0 faces R, so its top row runs right to left and is read backwards;
 * R's column 0 faces F, so its top row runs bottom to top and is read backwards
 * too; F's and L's column 0 face L and B, so both are already in reading order.
 */
const TAB_STICKERS: readonly (readonly [Face, number])[] = [
  ['B', 2],
  ['B', 1],
  ['B', 0],
  ['R', 2],
  ['R', 1],
  ['R', 0],
  ['F', 0],
  ['F', 1],
  ['F', 2],
  ['L', 0],
  ['L', 1],
  ['L', 2],
]

/** One grid cell, and the sticker drawn inside it — the difference is the gap. */
const CELL = 10
const INSET = 0.7
const STICKER = CELL - 2 * INSET
/** How far a tab reaches out from the grid, and the gap it leaves. */
const TAB = 4
const GAP = 1.5
/** Where the 3x3 starts: past the tabs on that side, and their gap. */
const GRID = TAB + GAP
/** The whole figure: the grid with a tab and a gap on each of the four sides. */
const SIZE = 2 * GRID + 3 * CELL

/**
 * The rectangle tab `index` occupies, in the order of {@link TAB_STICKERS}. The
 * three tabs of a side share one edge of the drawing and line up with the three
 * cells they touch, so a tab always sits directly outside its own cell.
 */
function tabRect(index: number) {
  const along = GRID + (index % 3) * CELL + INSET
  const far = GRID + 3 * CELL + GAP
  switch (Math.floor(index / 3)) {
    case 0:
      return { x: along, y: 0, width: STICKER, height: TAB }
    case 1:
      return { x: far, y: along, width: TAB, height: STICKER }
    case 2:
      return { x: along, y: far, width: STICKER, height: TAB }
    default:
      return { x: 0, y: along, width: TAB, height: STICKER }
  }
}

/**
 * The twenty-one stickers a figure shows for the case `algorithm` solves: the
 * nine of the U face, row-major with B at the top, and the twelve tabs in the
 * order of {@link TAB_STICKERS}.
 *
 * The case is derived from the algorithm itself — the inverse of an algorithm,
 * applied to a solved cube, is exactly the position that algorithm solves — so a
 * figure can never drift from the algorithm printed next to it.
 */
export function lastLayerStickers(algorithm: string): { cells: Facelet[]; tabs: Facelet[] } {
  const state = applyScramble(invertAlgorithm(algorithm))
  return {
    cells: state[FACE_INDEX.U].slice(),
    tabs: TAB_STICKERS.map(([face, index]) => state[FACE_INDEX[face]][index]),
  }
}

/** A sticker that does not show the U colour, in the orientation figure. */
const UNORIENTED = 'var(--muted)'

/** What colour a sticker is drawn in, which is the whole difference between the
 * two modes. */
function fillFor(sticker: Facelet, mode: LastLayerMode): string {
  if (mode === 'permutation') return FACE_COLOUR[sticker]
  return sticker === 'U' ? FACE_COLOUR.U : UNORIENTED
}

/**
 * The last-layer case that `algorithm` solves, in the conventional style: the U
 * face as a 3x3 seen from above with B at the top, ringed by the twelve side
 * stickers that touch it.
 *
 * A pure function of its props — no state, no ref, no effect — so it renders on
 * the server. Purely decorative: the algorithm printed beside it is the
 * accessible content, so the figure is hidden from assistive technology.
 *
 * Sizes itself to whatever box the caller reserves, via the viewBox.
 */
export function LastLayerFigure({ algorithm, mode }: { algorithm: string; mode: LastLayerMode }) {
  const { cells, tabs } = lastLayerStickers(algorithm)
  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      width="100%"
      height="100%"
      aria-hidden="true"
      focusable="false"
      className="block"
    >
      {/* The plastic between the stickers of the U face. The tabs sit outside
        * it, separated by their own gap. */}
      <rect x={GRID} y={GRID} width={3 * CELL} height={3 * CELL} rx={2} fill="var(--background)" />
      <g>
        {cells.map((sticker, position) => (
          <rect
            key={position}
            x={GRID + (position % 3) * CELL + INSET}
            y={GRID + Math.floor(position / 3) * CELL + INSET}
            width={STICKER}
            height={STICKER}
            rx={1.2}
            fill={fillFor(sticker, mode)}
          />
        ))}
      </g>
      <g>
        {tabs.map((sticker, index) => (
          <rect key={index} {...tabRect(index)} rx={1} fill={fillFor(sticker, mode)} />
        ))}
      </g>
    </svg>
  )
}
