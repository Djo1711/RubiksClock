import type { Facelet } from './facelets'

/**
 * The WCA colour scheme, as the CSS tokens declared in app/globals.css: one per
 * face, named after the face it belongs to on a solved cube.
 *
 * Stated once, so that every figure that draws a cube — the scramble net, the
 * last-layer figures on the algorithms page — paints a given sticker the same
 * colour. Values, not classes: these are read by SVG `fill` attributes.
 */
export const FACE_COLOUR: Record<Facelet, string> = {
  U: 'var(--color-cube-u)',
  R: 'var(--color-cube-r)',
  F: 'var(--color-cube-f)',
  D: 'var(--color-cube-d)',
  L: 'var(--color-cube-l)',
  B: 'var(--color-cube-b)',
}
