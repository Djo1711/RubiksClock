'use client'

import { useEffect, useRef } from 'react'

/**
 * Wraps cubing.js's <twisty-player> custom element. Loaded dynamically because
 * it registers custom elements and only works in the browser.
 */
export function CubePreview({ scramble }: { scramble: string }) {
  const host = useRef<HTMLDivElement>(null)
  const player = useRef<(HTMLElement & { alg: string }) | null>(null)

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
        alg: scramble,
      })
      instance.style.width = '100%'
      instance.style.height = '100%'
      host.current.replaceChildren(instance)
      player.current = instance as unknown as HTMLElement & { alg: string }
    })
    return () => {
      cancelled = true
    }
    // The player is created once; the effect below keeps its alg in sync.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (player.current) player.current.alg = scramble
  }, [scramble])

  return <div ref={host} className="h-40 w-40" aria-hidden="true" />
}
