/**
 * Dismiss phrases matched anywhere in the recognized sentence.
 * Punctuation, spacing, width, and Latin case are ignored on both sides, so
 *「好的，你给我退下吧。」contains the factory phrase「退下吧」.
 */

import { pinyin } from 'pinyin-pro'

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
 * The same containment check on toneless pinyin syllables, so an ASR homophone
 * still counts: 「大飞鱼，把明天也查一下」contains the spoken keyword 「大肥鱼」.
 * A one-syllable phrase is left to exact matching; every homophone would match it.
 */
export function containsPhonetic(text: string, phrase: string): boolean {
  const wanted = syllables(phrase)
  if (wanted.length < 2) return false
  const heard = syllables(text)
  if (heard.length < wanted.length) return false
  for (let start = 0; start <= heard.length - wanted.length; start += 1) {
    let hit = true
    for (let offset = 0; offset < wanted.length; offset += 1) {
      if (heard[start + offset] !== wanted[offset]) {
        hit = false
        break
      }
    }
    if (hit) return true
  }
  return false
}

/**
 * True when the utterance contains one of the configured phrases as a complete
 * substring. A phrase in the middle of a longer sentence counts. An empty list
 * never dismisses, and a phrase that normalizes to nothing is ignored.
 *
 * A two-syllable-or-longer phrase also matches its toneless pinyin homophone
 * (「推下吧」 for 「退下吧」). One-syllable phrases stay exact: every homophone
 * would match them, which is too broad for a command that ends the turn.
 */
export function isDismiss(text: string, phrases: readonly string[]): boolean {
  if (containsAny(text, phrases)) return true
  return phrases.some((phrase) => syllables(phrase).length >= 2 && containsPhonetic(text, phrase))
}

/**
 * True when the utterance contains any interject keyword, including a toneless
 * pinyin homophone of it. Aliases are extra spellings for the same keyword, so a
 * near-miss such as 「大灰鱼」 can be added without changing the spoken name.
 */
export function isInterject(text: string, keywords: string | readonly string[]): boolean {
  const list = typeof keywords === 'string' ? [keywords] : keywords
  return list.some((keyword) => containsAny(text, [keyword]) || containsPhonetic(text, keyword))
}

function syllables(text: string): string[] {
  const cleaned = normalizeUtterance(text)
  if (!cleaned) return []
  return pinyin(cleaned, { toneType: 'none', type: 'array', nonZh: 'consecutive' })
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
}
