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

/** 整句完整带出任意一条，就命中。空白、标点、全半角、拉丁大小写都忽略。 */
export function containsAny(text: string, phrases: readonly string[]): boolean {
  const spoken = normalizeUtterance(text)
  if (!spoken) return false
  return phrases.some((phrase) => {
    const command = normalizeUtterance(phrase)
    return command.length > 0 && spoken.includes(command)
  })
}

/**
 * True when the utterance contains one of the configured phrases as a complete
 * substring. A phrase in the middle of a longer sentence counts. An empty list
 * never dismisses, and a phrase that normalizes to nothing is ignored.
 */
export function isDismiss(text: string, phrases: readonly string[]): boolean {
  return containsAny(text, phrases)
}

/** True when the utterance contains the interject keyword. An empty keyword never matches. */
export function isInterject(text: string, keyword: string): boolean {
  return containsAny(text, [keyword])
}
