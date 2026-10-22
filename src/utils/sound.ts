type AudioContextConstructor = typeof AudioContext

let context: AudioContext | null = null

function getAudioContext(): AudioContext | null {
  if (context) return context
  const Constructor: AudioContextConstructor | undefined =
    typeof window === 'undefined'
      ? undefined
      : (window.AudioContext ??
        (window as unknown as { webkitAudioContext?: AudioContextConstructor })
          .webkitAudioContext)
  if (!Constructor) return null
  context = new Constructor()
  return context
}

/**
 * A short, gentle chime: rising notes for a right answer, a soft low note
 * otherwise. Does nothing where audio is unsupported.
 */
export function playResultSound(correct: boolean) {
  try {
    const audio = getAudioContext()
    if (!audio) return
    const notes = correct ? [523.25, 783.99] : [329.63]
    notes.forEach((frequency, index) => {
      const start = audio.currentTime + index * 0.12
      const oscillator = audio.createOscillator()
      const gain = audio.createGain()
      oscillator.type = 'sine'
      oscillator.frequency.value = frequency
      gain.gain.setValueAtTime(0.0001, start)
      gain.gain.exponentialRampToValueAtTime(0.2, start + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.25)
      oscillator.connect(gain).connect(audio.destination)
      oscillator.start(start)
      oscillator.stop(start + 0.3)
    })
  } catch {
    // Sound is a bonus; never let it break practice.
  }
}
