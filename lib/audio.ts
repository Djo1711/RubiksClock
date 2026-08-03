'use client'

/**
 * Short sine beeps for the 8 s and 12 s inspection warnings (A3b1, A3b2). The
 * AudioContext is created lazily: the first beep always follows a key press,
 * which satisfies the browser's autoplay gesture requirement.
 */
export function createBeeper() {
  let context: AudioContext | null = null

  const beepOnce = (startAt: number) => {
    if (!context) return
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    oscillator.type = 'sine'
    oscillator.frequency.value = 880
    gain.gain.setValueAtTime(0.0001, startAt)
    gain.gain.exponentialRampToValueAtTime(0.2, startAt + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.12)
    oscillator.connect(gain).connect(context.destination)
    oscillator.start(startAt)
    oscillator.stop(startAt + 0.13)
  }

  return {
    beep(count: number) {
      context ??= new AudioContext()
      context.resume().catch((error: unknown) => {
        console.error('Could not resume the audio context', error)
      })
      for (let index = 0; index < count; index += 1) {
        beepOnce(context.currentTime + index * 0.18)
      }
    },
  }
}
