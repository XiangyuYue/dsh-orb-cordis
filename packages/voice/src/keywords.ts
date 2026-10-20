/**
 * Wake phrase → sherpa keyword-spotter token line.
 * The line is `tokens @label` with no comment and no blank line.
 * Sherpa crashes if the file contains anything else.
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { pinyin } from 'pinyin-pro'

const INITIAL_2 = ['zh', 'ch', 'sh']
const INITIAL_1 = new Set([
  'b', 'p', 'm', 'f', 'd', 't', 'n', 'l', 'g', 'k', 'h',
  'j', 'q', 'x', 'r', 'z', 'c', 's', 'y', 'w',
])

export interface KeywordContext {
  readonly tokens: ReadonlySet<string>
  readonly lexicon: ReadonlyMap<string, readonly string[]>
}

export function contextFromFiles(modelDir: string): KeywordContext {
  return {
    tokens: loadTokens(join(modelDir, 'tokens.txt')),
    lexicon: loadLexicon(join(modelDir, 'en.phone')),
  }
}

/** One phrase, one token line. `display` is the label after `@`. */
export function tokenizeKeyword(text: string, ctx: KeywordContext, display = text): string {
  const label = display.trim().replace(/\s+/g, '_')
  const tokens: string[] = []
  const re = /([\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]+)|([A-Za-z][A-Za-z'-]*)/g
  let last = 0
  for (let match = re.exec(text); match !== null; match = re.exec(text)) {
    const gap = text.slice(last, match.index)
    if (/[^\s_]/.test(gap)) throw new Error(`unsupported character in "${gap.trim()}"`)
    last = re.lastIndex
    if (match[1]) {
      for (const syllable of pinyin(match[1], { toneType: 'symbol', type: 'array' })) {
        tokens.push(...splitSyllable(syllable, ctx.tokens))
      }
    } else {
      const word = (match[2] ?? '').toUpperCase()
      const bare = word.replace(/['-]/g, '')
      const phones = ctx.lexicon.get(word) ?? ctx.lexicon.get(bare) ?? segmentOov(bare, ctx.lexicon)
      if (!phones) throw new Error(`no pronunciation for "${match[2]}"`)
      for (const phone of phones) {
        if (!ctx.tokens.has(phone)) throw new Error(`phone "${phone}" is not in tokens.txt`)
      }
      tokens.push(...phones)
    }
  }
  if (tokens.length === 0) throw new Error('empty wake phrase')
  return `${tokens.join(' ')} @${label}`
}

/** Several phrases, one token line each. A phrase that cannot be tokenized is skipped. */
export function keywordLines(phrases: readonly string[], ctx: KeywordContext): string[] {
  const lines: string[] = []
  for (const phrase of phrases) {
    const text = phrase.trim()
    if (!text) continue
    try {
      lines.push(tokenizeKeyword(text, ctx))
    } catch {
      // One unsupported phrase must not take the other wake words down with it.
    }
  }
  return lines
}

function splitSyllable(syllable: string, tokens: ReadonlySet<string>): string[] {
  const candidates: string[][] = []
  if (INITIAL_2.some((initial) => syllable.startsWith(initial))) {
    candidates.push([syllable.slice(0, 2), syllable.slice(2)])
  }
  const first = syllable[0] ?? ''
  if (INITIAL_1.has(first)) candidates.push([first, syllable.slice(1)])
  candidates.push([syllable])
  for (const candidate of candidates) {
    if (candidate.every((token) => token !== '' && tokens.has(token))) return candidate
  }
  throw new Error(`cannot split syllable "${syllable}"`)
}

function segmentOov(word: string, lexicon: ReadonlyMap<string, readonly string[]>): readonly string[] | undefined {
  const memo = new Map<string, readonly string[] | undefined>()
  const solve = (index: number, allowSingle: boolean): readonly string[] | undefined => {
    if (index === word.length) return []
    const key = `${index}:${allowSingle ? 1 : 0}`
    if (memo.has(key)) return memo.get(key)
    for (let len = word.length - index; len >= 1; len -= 1) {
      if (len === 1 && !allowSingle) continue
      const piece = word.slice(index, index + len)
      const phones = lexicon.get(piece)
      if (phones === undefined) continue
      const rest = solve(index + len, allowSingle)
      if (rest !== undefined) {
        const out = [...phones, ...rest]
        memo.set(key, out)
        return out
      }
    }
    memo.set(key, undefined)
    return undefined
  }
  return solve(0, false) ?? solve(0, true)
}

function loadTokens(file: string): Set<string> {
  const tokens = new Set<string>()
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const token = line.trim().split(/\s+/)[0]
    if (token && !token.startsWith('<')) tokens.add(token)
  }
  return tokens
}

function loadLexicon(file: string): Map<string, string[]> {
  const lexicon = new Map<string, string[]>()
  let text = ''
  try {
    text = readFileSync(file, 'utf8')
  } catch {
    return lexicon
  }
  for (const line of text.split('\n')) {
    const parts = line.trim().split(/\s+/)
    const word = parts[0]
    if (word && parts.length >= 2) lexicon.set(word, parts.slice(1))
  }
  return lexicon
}
