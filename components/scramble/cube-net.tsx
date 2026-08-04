import { applyScramble, FACES, type Facelet } from '@/lib/cube/facelets'

/** Stickers are filled from the WCA colour tokens defined in app/globals.css. */
const COLOUR: Record<Facelet, string> = {
  U: 'var(--color-cube-u)',
  R: 'var(--color-cube-r)',
  F: 'var(--color-cube-f)',
  D: 'var(--color-cube-d)',
  L: 'var(--color-cube-l)',
  B: 'var(--color-cube-b)',
}

/**
 * Where each face sits in the unfolded net, in cell units: the conventional
 * cross, with U above the L F R B band and D below it. The facelet indexing of
 * lib/cube/facelets.ts is chosen so that every face's own row-major order is
 * already the right way up here, with no per-face flip.
 */
const ORIGIN: Record<Facelet, readonly [number, number]> = {
  U: [3, 0],
  L: [0, 3],
  F: [3, 3],
  R: [6, 3],
  B: [9, 3],
  D: [3, 6],
}

/** One grid cell, and the sticker drawn inside it — the difference is the gap. */
const CELL = 10
const INSET = 0.7
const STICKER = CELL - 2 * INSET

/**
 * The scrambled cube as a 2D net, computed from the scramble itself.
 *
 * A pure function of its prop — no state, no ref, no effect — so it renders on
 * the server and is there on the first paint rather than appearing after a
 * client-side load. Purely decorative: the scramble text next to it is the
 * accessible source of truth, so the net is hidden from assistive technology.
 *
 * Sizes itself to whatever box the caller reserves, via the viewBox.
 */
export function CubeNet({ scramble }: { scramble: string }) {
  const state = applyScramble(scramble)
  return (
    <svg
      viewBox={`0 0 ${12 * CELL} ${9 * CELL}`}
      width="100%"
      height="100%"
      aria-hidden="true"
      focusable="false"
      className="block"
    >
      {FACES.map((face, faceIndex) => {
        const [originColumn, originRow] = ORIGIN[face]
        const x = originColumn * CELL
        const y = originRow * CELL
        return (
          <g key={face}>
            {/* The plastic between the stickers. */}
            <rect x={x} y={y} width={3 * CELL} height={3 * CELL} rx={2} fill="var(--background)" />
            {state[faceIndex].map((sticker, position) => (
              <rect
                key={position}
                x={x + (position % 3) * CELL + INSET}
                y={y + Math.floor(position / 3) * CELL + INSET}
                width={STICKER}
                height={STICKER}
                rx={1.2}
                fill={COLOUR[sticker]}
              />
            ))}
          </g>
        )
      })}
    </svg>
  )
}
