/**
 * Whole-utterance dismiss phrases.
 * Trailing punctuation is ignored. A phrase inside a longer sentence is not a hit.
 */

const TRAILING_PUNCTUATION = /[。！？!?.,，、]+$/u

/** Trim and drop ending punctuation so「你退下吧。」matches「你退下吧」. */
export function normalizeUtterance(text: string): string {
  return text.trim().replace(TRAILING_PUNCTUATION, '').trim()
}

/** True when the utterance is exactly one of the configured phrases. An empty list never dismisses. */
export function isDismiss(text: string, phrases: readonly string[]): boolean {
  const spoken = normalizeUtterance(text)
  if (!spoken) return false
  return phrases.some((phrase) => {
    const command = normalizeUtterance(phrase)
    return command.length > 0 && spoken === command
  })
}
