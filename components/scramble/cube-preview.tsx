'use client'

import { useEffect, useRef } from 'react'

/**
 * Wraps cubing.js's <twisty-player> custom element. Loaded dynamically because
 * it registers custom elements and only works in the browser.
 */
export function CubePreview({ scramble }: { scramble: string }) {
  const host = useRef<HTMLDivElement>(null)
  const player = useRef<(HTMLElement & { alg: string }) | null>(null)
  const latestScramble = useRef(scramble)

  // Declared before the player-creation effect below so it commits first:
  // effects at the same level run in declaration order, so by the time the
  // player-creation effect's async import resolves, this ref always holds
  // whatever scramble was current as of the latest render — not whichever
  // scramble happened to be in scope when that effect was first created.
  useEffect(() => {
    latestScramble.current = scramble
  }, [scramble])

  useEffect(() => {
    let cancelled = false
    void import('cubing/twisty').then(({ TwistyPlayer }) => {
      if (cancelled || !host.current) return
      const instance = new TwistyPlayer({
        puzzle: '3x3x3',
        visualization: '3D',
        background: 'none',
        controlPanel: 'none',
        hintFacelets: 'none',
        alg: latestScramble.current,
      })
      instance.style.width = '100%'
      instance.style.height = '100%'
      host.current.replaceChildren(instance)
      player.current = instance as unknown as HTMLElement & { alg: string }
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (player.current) player.current.alg = scramble
  }, [scramble])

  // Fills whatever box the caller reserves for it, so the preview never
  // changes the height of the row it sits in.
  return <div ref={host} className="h-full w-full" aria-hidden="true" />
}
