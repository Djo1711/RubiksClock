'use client'

/** The character to draw for a physical key position, AZERTY-labelled. */
const KEY_LABEL: Record<string, string> = {
  KeyA: 'A', KeyB: 'B', KeyC: 'C', KeyD: 'D', KeyE: 'E', KeyF: 'F', KeyG: 'G',
  KeyH: 'H', KeyI: 'I', KeyJ: 'J', KeyK: 'K', KeyL: 'L', KeyM: 'M', KeyN: 'N',
  KeyO: 'O', KeyP: 'P', KeyQ: 'Q', KeyR: 'R', KeyS: 'S', KeyT: 'T', KeyU: 'U',
  KeyV: 'V', KeyW: 'W', KeyX: 'X', KeyY: 'Y', KeyZ: 'Z',
}

export function keyLabel(code: string): string {
  return KEY_LABEL[code] ?? code.replace(/^Key/, '')
}

export function KeyHints({
  keys,
  held,
}: {
  keys: readonly string[]
  held: readonly string[]
}) {
  const half = Math.ceil(keys.length / 2)
  const hands = [keys.slice(0, half), keys.slice(half)]
  return (
    <div className="flex items-center gap-6" aria-hidden="true">
      {hands.map((hand, index) => (
        <div key={index} className="flex gap-2">
          {hand.map((code) => (
            <span
              key={code}
              className={`flex h-9 w-9 items-center justify-center rounded-md border font-mono text-sm transition-colors ${
                held.includes(code)
                  ? 'border-(--color-state-ready) bg-(--color-state-ready)/15 text-(--color-state-ready)'
                  : 'border-neutral-700 text-neutral-500'
              }`}
            >
              {keyLabel(code)}
            </span>
          ))}
        </div>
      ))}
    </div>
  )
}
