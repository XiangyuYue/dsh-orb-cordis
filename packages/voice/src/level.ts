/**
 * Microphone level for the voice-input meter.
 * The child feeds every captured block here; the page only sees a smoothed 0..1 value
 * a few dozen times a second, never the samples themselves.
 */

/** Send at most twenty updates a second; faster than the eye, slow enough for the UI. */
export const LEVEL_INTERVAL_MS = 50

/** A level at or below this RMS is silence. Speech sits around 0.02 to 0.2. */
const FLOOR_RMS = 0.0005
const MAX_RMS = 0.35

/** A short attack and a slower release make the bar feel like it follows a voice. */
const RELEASE = 0.78

export class LevelMeter {
  private sum = 0
  private count = 0
  private lastAt = -Infinity
  private value = 0

  /** Add captured samples. Returns a new level when the reporting interval elapsed. */
  push(samples: Float32Array, now: number): number | undefined {
    if (samples.length > 0) {
      let sum = 0
      for (let i = 0; i < samples.length; i += 1) {
        const sample = samples[i] ?? 0
        sum += sample * sample
      }
      this.sum += sum
      this.count += samples.length
    }
    if (now - this.lastAt < LEVEL_INTERVAL_MS) return undefined
    this.lastAt = now
    if (this.count === 0) return undefined
    const rms = Math.sqrt(this.sum / this.count)
    this.sum = 0
    this.count = 0
    const target = normalize(rms)
    this.value = target >= this.value ? target : this.value * RELEASE + target * (1 - RELEASE)
    return round(this.value)
  }

  /** A new listening mode starts from silence, not from the previous phrase's tail. */
  reset(): void {
    this.sum = 0
    this.count = 0
    this.lastAt = -Infinity
    this.value = 0
  }
}

/**
 * RMS to a 0..1 display value. A square-root curve keeps quiet speech visible instead
 * of pinning the bar near zero until the user nearly shouts.
 */
export function normalize(rms: number): number {
  if (!(rms > FLOOR_RMS)) return 0
  return round(Math.min(1, Math.sqrt(Math.min(rms, MAX_RMS) / MAX_RMS)))
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000
}
