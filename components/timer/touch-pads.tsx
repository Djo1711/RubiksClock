'use client'

import { useI18n } from '@/components/i18n-provider'

export function TouchPads({
  keys,
  onPress,
  onRelease,
  running,
  onStop,
}: {
  keys: readonly string[]
  onPress: (code: string) => void
  onRelease: (code: string) => void
  running: boolean
  onStop: () => void
}) {
  const { t } = useI18n()
  const half = Math.ceil(keys.length / 2)
  const hands = [keys.slice(0, half), keys.slice(half)]
  return (
    <div className="grid w-full grid-cols-2 gap-3 md:hidden">
      {hands.map((hand, index) => (
        <button
          key={index}
          type="button"
          aria-label={index === 0 ? t.touchPadLeft : t.touchPadRight}
          className="h-28 rounded-xl border border-neutral-500 bg-neutral-900 active:border-(--color-state-ready) active:bg-(--color-state-ready)/15"
          onPointerDown={(event) => {
            event.preventDefault()
            // While running, bringing either hand back down stops the solve —
            // mirroring the Stackmat — instead of arming a fresh attempt.
            if (running) {
              onStop()
              return
            }
            hand.forEach(onPress)
          }}
          onPointerUp={(event) => {
            event.preventDefault()
            if (running) return
            hand.forEach(onRelease)
          }}
          onPointerCancel={() => {
            if (running) return
            hand.forEach(onRelease)
          }}
        />
      ))}
    </div>
  )
}
