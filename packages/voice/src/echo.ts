/**
 * Text echo check. Acoustic echo cancellation is the real filter; this only
 * drops a transcript that is mostly the line we were just speaking.
 */

import { pinyin } from 'pinyin-pro'
import { mentions, normalizeUtterance } from './dismiss.ts'

export interface SpokenLine {
  readonly text: string
  readonly startedAt: number
  /** Still playing when undefined. */
  readonly endedAt: number | undefined
}

/**
 * 这句转写是不是我们自己播出去的声音。
 * 取和 [from - 500ms, to] 有重叠的播报句，把双方都转成不带声调的拼音音节，
 * 求最长公共子序列。它占转写音节数的比例不低于 0.6，就算回声。
 * 转写不足 2 个音节时，不按回声处理。
 * 转写里带出了插话关键词或任意一条退下口令，而重叠的播报句里没有它，就不是回声。
 */
export function isEcho(
  utterance: string,
  spoken: readonly SpokenLine[],
  window: { readonly from: number, readonly to: number },
  commands: readonly string[],
): boolean {
  const heard = syllables(utterance)
  if (heard.length < 2) return false
  const overlapping = spoken.filter((line) => overlaps(line, window))
  if (overlapping.length === 0) return false
  for (const command of commands) {
    if (!mentions(utterance, command)) continue
    if (!overlapping.some((line) => mentions(line.text, command))) return false
  }
  const played = syllables(overlapping.map((line) => line.text).join(''))
  if (played.length === 0) return false
  // A paragraph is one playback line here: the assistant's 1.3k-character answer is
  // sent as a single `speak`, so the text we compare against covers minutes while the
  // user's phrase covers a second or two. Any short sentence then looks like 60% of
  // that text and a genuine interjection ("大肥鱼别说了。") gets dropped. Only judge
  // echo when the playing text is comparable to what was heard; for a long paragraph
  // the acoustic echo canceller and the keyword requirement already do the filtering.
  if (played.length >= heard.length * 4) return false
  return longestCommon(heard, played) / heard.length >= 0.6
}

function overlaps(line: SpokenLine, window: { readonly from: number, readonly to: number }): boolean {
  const start = window.from - 500
  if (line.startedAt >= window.to) return false
  if (line.endedAt !== undefined && line.endedAt <= start) return false
  return true
}

function syllables(text: string): string[] {
  const cleaned = normalizeUtterance(text)
  if (!cleaned) return []
  const parts = pinyin(cleaned, { toneType: 'none', type: 'array', nonZh: 'consecutive' })
  return parts.map((part) => part.trim()).filter((part) => part.length > 0)
}

function longestCommon(left: readonly string[], right: readonly string[]): number {
  const rows = left.length + 1
  const cols = right.length + 1
  const score = new Array<number>(cols).fill(0)
  for (let row = 1; row < rows; row += 1) {
    let previous = 0
    for (let col = 1; col < cols; col += 1) {
      const current = score[col] ?? 0
      if (left[row - 1] === right[col - 1]) score[col] = previous + 1
      else score[col] = Math.max(current, score[col - 1] ?? 0)
      previous = current
    }
  }
  return score[cols - 1] ?? 0
}
