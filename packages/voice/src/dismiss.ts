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
  return phoneticHit(text, phrase, 0, false)
}

/**
 * The interject keyword is the weak spot: SenseVoice turns 「大肥鱼」 into
 * 「贾飞鱼」/「大飞鱼」 often enough that an exact homophone loses half the
 * interjections. A three-syllable-or-longer keyword therefore allows one wrong
 * syllable, as long as the **last** syllable is still right — that anchor keeps
 * 「大飞机」 or 「坐下吧」 from matching 「大肥鱼」/「退下吧」.
 */
export function containsKeywordPhonetic(text: string, phrase: string): boolean {
  const wanted = syllables(phrase)
  return phoneticHit(text, phrase, wanted.length >= 3 ? 1 : 0, true)
}

function phoneticHit(text: string, phrase: string, slack: number, anchorLast: boolean): boolean {
  const wanted = syllables(phrase)
  if (wanted.length < 2) return false
  const heard = syllables(text)
  if (heard.length < wanted.length) return false
  for (let start = 0; start <= heard.length - wanted.length; start += 1) {
    let missed = 0
    let hit = true
    for (let offset = 0; offset < wanted.length; offset += 1) {
      if (heard[start + offset] === wanted[offset]) continue
      if (anchorLast && offset === wanted.length - 1) {
        hit = false
        break
      }
      missed += 1
      if (missed > slack) {
        hit = false
        break
      }
    }
    if (hit && missed <= slack) return true
  }
  return false
}

/** The phrase is present exactly, or close enough by pinyin to be the same spoken word. */
export function mentions(text: string, phrase: string): boolean {
  return containsAny(text, [phrase]) || containsPhonetic(text, phrase) || containsKeywordPhonetic(text, phrase)
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
  return containsAny(text, phrases)
    || phrases.some((phrase) => syllables(phrase).length >= 2 && containsPhonetic(text, phrase))
}

/**
 * True when the utterance contains any interject keyword, including a toneless
 * pinyin homophone and (for three syllables or more) one wrong non-final syllable.
 * Aliases are extra spellings for the same keyword, so a near-miss such as
 * 「大灰鱼」 can be added without changing the spoken name.
 */
export function isInterject(text: string, keywords: string | readonly string[]): boolean {
  const list = typeof keywords === 'string' ? [keywords] : keywords
  return list.some((keyword) => containsAny(text, [keyword]) || containsKeywordPhonetic(text, keyword))
}

function syllables(text: string): string[] {
  const cleaned = normalizeUtterance(text)
  if (!cleaned) return []
  return pinyin(cleaned, { toneType: 'none', type: 'array', nonZh: 'consecutive' })
    .map((part) => part.trim())
    .filter((part) => part.length > 0)
}
