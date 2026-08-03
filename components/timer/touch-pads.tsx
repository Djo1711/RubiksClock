'use client'

export function TouchPads({
  keys,
  onPress,
  onRelease,
}: {
  keys: readonly string[]
  onPress: (code: string) => void
  onRelease: (code: string) => void
}) {
  const half = Math.ceil(keys.length / 2)
  const hands = [keys.slice(0, half), keys.slice(half)]
  return (
    <div className="grid w-full grid-cols-2 gap-3 md:hidden">
      {hands.map((hand, index) => (
        <button
          key={index}
          type="button"
          aria-label={index === 0 ? 'Left hand pad' : 'Right hand pad'}
          className="h-28 rounded-xl border border-neutral-700 bg-neutral-900 active:border-(--color-state-ready) active:bg-(--color-state-ready)/15"
          onPointerDown={(event) => {
            event.preventDefault()
            hand.forEach(onPress)
          }}
          onPointerUp={(event) => {
            event.preventDefault()
            hand.forEach(onRelease)
          }}
          onPointerCancel={() => hand.forEach(onRelease)}
        />
      ))}
    </div>
  )
}
