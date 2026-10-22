/**
 * Playback volume for speech.
 * Both backends leave the child through the same speaker, so one gain controls the
 * local model and Qwen alike. 1 is the model's own level; 0 is silent.
 */

export const TTS_VOLUME_MIN = 0
export const TTS_VOLUME_MAX = 2
export const DEFAULT_TTS_VOLUME = 1

/** Round to the settings' two decimals, then pull into range. Non-numbers are the factory volume. */
export function clampTtsVolume(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_TTS_VOLUME
  const rounded = Math.round(value * 100) / 100
  if (rounded < TTS_VOLUME_MIN) return TTS_VOLUME_MIN
  if (rounded > TTS_VOLUME_MAX) return TTS_VOLUME_MAX
  return rounded
}

/**
 * One speaker sample at `gain`.
 * A boost is clamped to full scale instead of wrapping around, and a NaN from a
 * broken decoder becomes silence rather than a click.
 */
export function scaledSample(sample: number, gain: number): number {
  if (!Number.isFinite(sample)) return 0
  if (gain === DEFAULT_TTS_VOLUME) return sample
  const value = sample * gain
  if (!Number.isFinite(value)) return 0
  if (value > 1) return 1
  if (value < -1) return -1
  return value
}
