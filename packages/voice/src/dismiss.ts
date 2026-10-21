/**
 * Dismiss phrases matched anywhere in the recognized sentence.
 * Punctuation, spacing, width, and Latin case are ignored on both sides, so
 *「好的，你给我退下吧。」contains the factory phrase「退下吧」.
 */

const IGNORED = /[\s\p{P}\p{S}]+/gu

/** Drop punctuation, symbols, and whitespace; normalize width and Latin case. */
export function normalizeUtterance(text: string): string {
  return text.normalize('NFKC').toLowerCase().replace(IGNORED, '')
}

/**
 * True when the utterance contains one of the configured phrases as a complete
 * substring. A phrase in the middle of a longer sentence counts. An empty list
 * never dismisses, and a phrase that normalizes to nothing is ignored.
 */
export function isDismiss(text: string, phrases: readonly string[]): boolean {
  const spoken = normalizeUtterance(text)
  if (!spoken) return false
  return phrases.some((phrase) => {
    const command = normalizeUtterance(phrase)
    return command.length > 0 && spoken.includes(command)
  })
}
