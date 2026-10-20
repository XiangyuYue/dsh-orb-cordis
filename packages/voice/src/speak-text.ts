/**
 * Text the speaker can say, and how fast.
 * The queue cuts a streaming reply into sentences. The child then cleans Markdown,
 * splits languages, and turns the speed setting into a model speed plus SOLA.
 */

export interface ReadyPrefix {
  readonly ready: string
  readonly rest: string
}

/**
 * Take a prefix that can be spoken now.
 * A forced cut emits the whole buffer, which is how a turn's tail becomes closing text.
 * ASCII periods inside numbers (`1.13.8`) and tokens (`voice.mjs`) stay put.
 * Past 60 characters with no sentence end, cut at a comma unless that would
 * split an unfinished Latin word or number.
 */
export function takeReadyPrefix(buffer: string, force = false): ReadyPrefix {
  if (force) return { ready: buffer, rest: '' }
  let cut = -1
  for (let i = 0; i < buffer.length; i++) {
    const ch = buffer[i] ?? ''
    if ('。！？'.includes(ch)) cut = i + 1
    else if ('.!?'.includes(ch) && asciiSentenceBoundary(buffer, i)) cut = i + 1
  }
  if (cut > 0) return { ready: buffer.slice(0, cut), rest: buffer.slice(cut) }
  if (buffer.length >= 60 && !/[A-Za-z0-9.]+$/.test(buffer)) {
    const idx = Math.max(buffer.lastIndexOf('，'), buffer.lastIndexOf(','), buffer.lastIndexOf('；'))
    if (idx > 20) return { ready: buffer.slice(0, idx + 1), rest: buffer.slice(idx + 1) }
  }
  return { ready: '', rest: buffer }
}

/**
 * An ASCII `.` `!` `?` ends a sentence only at a real boundary.
 * Testing `/^\s|$/` against the single next character is not that check:
 * `$` matches the end of every string, so `voice.mjs` would split.
 */
function asciiSentenceBoundary(buffer: string, index: number): boolean {
  const next = buffer[index + 1]
  const atBoundary = next === undefined || /\s/.test(next)
  const previous = buffer[index - 1] ?? ''
  return atBoundary && !/[0-9]/.test(previous)
}

export interface SpeechSegment {
  readonly lang: 'zh' | 'en'
  readonly text: string
}

const ZH_MAP: readonly (readonly [RegExp, string])[] = [
  [/；/g, '，'],
  [/;/g, '，'],
  [/[（(]/g, '，'],
  [/[）)]/g, '，'],
  [/[《》【】“”‘’]/g, ''],
  [/…+/g, '，'],
  [/—+|\s*[-－]{1,2}\s*/g, '，'],
  [/·/g, '，'],
  [/(\d+(?:\.\d+)?)\s*[％%]/g, '百分之$1'],
  [/\s*→\s*/g, '，变成，'],
  [/[←↑↓]/g, '，'],
  [/×/g, '乘'],
  [/÷/g, '除以'],
  [/≈/g, '大约'],
  [/[＋+]/g, '，加，'],
  [/[＝=]/g, '，等于，'],
  [/[~～]/g, '，'],
  [/@/g, '，艾特，'],
  [/[#＃]/g, '，井号，'],
  [/&/g, '，和，'],
  [/[\\/*|<>[\]{}^`$€¥°•]/g, '，'],
  [/!/g, '！'],
  [/\t/g, ' '],
  [/\n{1,}/g, '。'],
  [/[,]/g, '，'],
]

/** Drop Markdown the engines would read as symbols. A code block becomes one short phrase. */
export function stripMarkdown(markdown: string): string {
  let text = String(markdown)
  text = text.replace(/```[\s\S]*?```/g, '，省略一段代码，')
  text = text.replace(/`([^`]*)`/g, '$1')
  text = text.replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
  text = text.replace(/\[([^\]]*)\]\([^)]*\)/g, (_match, label: string) => (label.trim() ? label : '链接'))
  text = text.replace(/^\s{0,3}#{1,6}\s+/gm, '')
  text = text.replace(/^\s{0,3}>\s?/gm, '')
  text = text.replace(/^\s*\|?[\s:|-]+\|[\s:|-]*$/gm, '')
  text = text.replace(/^\s*[-*+]\s+/gm, '，')
  text = text.replace(/^\s*(\d{1,2})[.)]\s+/gm, '第$1，')
  text = text.replace(/\*\*([^*]+)\*\*/g, '$1')
  text = text.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1$2')
  text = text.replace(/\s*\|\s*/g, '，')
  text = text.replace(/<[^>]{1,60}>/g, '')
  return text
}

export function normalizeZh(text: string): string {
  let next = text.replace(/(\d)\s*[~～]\s*(\d)/g, '$1 到 $2')
  for (const [pattern, replacement] of ZH_MAP) next = next.replace(pattern, replacement)
  next = next.replace(/[，]{2,}/g, '，')
  next = next.replace(/[，]\s*([。！？])/g, '$1')
  next = next.replace(/([。！？])[，]+/g, '$1')
  next = next.replace(/(^|[\n。！？])\s*[，]\s*/g, '$1')
  return next.replace(/^[，\s]+/, '').replace(/\s+$/, '')
}

export function normalizeEn(text: string): string {
  const marks: Record<string, string> = { '，': ', ', '。': '. ', '！': '! ', '？': '? ', '：': ': ', '、': ', ' }
  return text.replace(/[，。！？：、]/g, (mark) => marks[mark] ?? mark).replace(/\s{2,}/g, ' ').trim()
}

/** Chinese and Latin run on different engines. Digits stay with the run they follow. */
export function segmentLanguages(text: string): SpeechSegment[] {
  const pieces: { lang: 'zh' | 'en', buf: string }[] = []
  let current: { lang: 'zh' | 'en', buf: string } | undefined
  const push = (lang: 'zh' | 'en', char: string) => {
    if (current?.lang === lang) current.buf += char
    else pieces.push(current = { lang, buf: char })
  }
  for (const char of text) {
    if (/[\u3000-\u303f\u4e00-\u9fff\uff00-\uffef]/.test(char)) push('zh', char)
    else if (/[A-Za-z]/.test(char)) push('en', char)
    else if (current) current.buf += char
    else pieces.push(current = { lang: 'zh', buf: char })
  }
  const merged: SpeechSegment[] = []
  for (const piece of pieces) {
    if (!piece.buf.trim()) continue
    const last = merged.at(-1)
    if (last?.lang === piece.lang) merged[merged.length - 1] = { lang: last.lang, text: last.text + piece.buf }
    else merged.push({ lang: piece.lang, text: piece.buf })
  }
  return merged.filter((piece) => /[^\s]/.test(piece.text))
}

/** Markdown in, language runs out, each run normalized for its engine. */
export function prepare(markdown: string): SpeechSegment[] {
  return segmentLanguages(stripMarkdown(markdown)).map((piece) => ({
    lang: piece.lang,
    text: piece.lang === 'zh' ? normalizeZh(piece.text) : normalizeEn(piece.text),
  })).filter((piece) => piece.text.trim() !== '')
}

/** Short sentences. An ASCII period only splits on a real boundary, same as {@link takeReadyPrefix}. */
export function splitSentences(text: string, lang: 'zh' | 'en', maxLen = 46): string[] {
  const parts: string[] = []
  const chars = [...text]
  let buffer = ''
  for (let i = 0; i < chars.length; i += 1) {
    const char = chars[i] ?? ''
    buffer += char
    const chineseEnd = '。！？'.includes(char)
    const englishEnd = lang === 'en' && '.!?'.includes(char) && asciiSentenceBoundary(text, i)
    if (chineseEnd || englishEnd) {
      parts.push(buffer)
      buffer = ''
    }
  }
  if (buffer.trim()) parts.push(buffer)
  const out: string[] = []
  for (const part of parts) {
    if (part.trim().length <= maxLen) {
      out.push(part.trim())
      continue
    }
    let current = ''
    for (const char of part) {
      current += char
      if ('，、：,;'.includes(char) && current.length >= maxLen * 0.6) {
        out.push(current.trim())
        current = ''
      }
    }
    if (current.trim()) out.push(current.trim())
  }
  return out.filter(Boolean)
}

/** Pause after a sentence, shortened as the model speed rises. */
export function gapFor(text: string, speed: number): number {
  const trimmed = text.trim()
  const base = /[。！？.!?]["')\]]*$/.test(trimmed) ? 150 : /[，、：,:;]["')\]]*$/.test(trimmed) ? 80 : 110
  return Math.round(base / Math.max(speed, 0.1))
}

const SPEED_CURVES = {
  zh: [[1, 1], [1.2, 1.2], [1.5, 1.43], [1.8, 1.73], [2, 1.78], [2.5, 2.23], [3, 2.68]],
  en: [[1, 0.99], [1.2, 1.22], [1.5, 1.52], [1.8, 1.83], [2, 2.04], [2.5, 2.54], [3, 3.03]],
} as const

/** Measured model speed → how fast the audio actually is. */
export function actualSpeed(kind: 'zh' | 'en', param: number): number {
  const curve = SPEED_CURVES[kind]
  const first = curve[0]
  if (!first || param <= first[0]) return first?.[1] ?? param
  for (let i = 1; i < curve.length; i += 1) {
    const right = curve[i]
    const left = curve[i - 1]
    if (!right || !left || param > right[0]) continue
    const span = right[0] - left[0]
    return left[1] + ((param - left[0]) * (right[1] - left[1])) / span
  }
  const last = curve[curve.length - 1]
  if (!last) return param
  return (last[1] / last[0]) * param
}

export interface SpeedPlan {
  readonly target: number
  /** Chinese model speed. Never above 1.5; the rest is SOLA. */
  readonly modelZh: number
  /** English model speed, compensated so the result lands on the target. */
  readonly modelEn: number
  readonly solaRatio: number
}

/**
 * Split a target speed into model speeds and one SOLA ratio.
 * Chinese stays at or below 1.5. English is slowed by the same SOLA ratio
 * so both languages land on the target.
 */
export function planSpeeds(target: number): SpeedPlan {
  const clamped = Math.min(3, Math.max(1, target))
  const modelZh = Math.min(clamped, 1.5)
  const solaRatio = clamped / actualSpeed('zh', modelZh)
  const modelEn = Math.min(3, Math.max(0.8, Math.round((clamped / solaRatio) * 100) / 100))
  return { target: clamped, modelZh, modelEn, solaRatio }
}

/** Time-compress without changing pitch. Frames are dropped, not phonemes. */
export function sola(samples: Float32Array, rate: number, ratio: number): Float32Array {
  if (!(ratio > 1.001) || samples.length === 0) return samples
  const frame = Math.max(64, Math.round((40 / 1000) * rate))
  const hopOut = Math.max(32, Math.round(frame / 2))
  const hopIn = Math.max(1, Math.round(hopOut * ratio))
  const search = Math.max(0, Math.round((12 / 1000) * rate))
  const window = new Float32Array(frame)
  for (let i = 0; i < frame; i += 1) window[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / frame)
  const outLen = Math.ceil((samples.length / hopIn) * hopOut) + frame
  const out = new Float32Array(outLen)
  const weight = new Float32Array(outLen)
  let previous = -1
  let outPos = 0
  for (let pos = 0; pos + frame <= samples.length; pos += hopIn) {
    let best = 0
    if (previous >= 0 && search > 0) {
      const tail = previous + hopOut
      let bestScore = -Infinity
      for (let delta = -search; delta <= search; delta += 2) {
        const start = pos + delta
        if (start < 0 || tail + hopOut > samples.length || start + hopOut > samples.length) continue
        let score = 0
        for (let i = 0; i < hopOut; i += 2) score += (samples[tail + i] ?? 0) * (samples[start + i] ?? 0)
        if (score > bestScore) {
          bestScore = score
          best = delta
        }
      }
    }
    const start = Math.max(0, Math.min(samples.length - frame, pos + best))
    for (let i = 0; i < frame; i += 1) {
      out[outPos + i] = (out[outPos + i] ?? 0) + (samples[start + i] ?? 0) * (window[i] ?? 0)
      weight[outPos + i] = (weight[outPos + i] ?? 0) + (window[i] ?? 0)
    }
    previous = start
    outPos += hopOut
  }
  for (let i = 0; i < outLen; i += 1) {
    const scale = weight[i] ?? 0
    if (scale > 0.35) out[i] = (out[i] ?? 0) / scale
  }
  return out.slice(0, Math.min(outLen, outPos + Math.round(frame / 2)))
}

export function trimSilence(samples: Float32Array, rate: number): Float32Array {
  let start = 0
  let end = samples.length - 1
  while (start < samples.length && Math.abs(samples[start] ?? 0) < 0.006) start += 1
  while (end > start && Math.abs(samples[end] ?? 0) < 0.006) end -= 1
  if (end <= start) return new Float32Array(0)
  const keep = Math.round((15 / 1000) * rate)
  return samples.slice(Math.max(0, start - keep), Math.min(samples.length, end + keep + 1))
}

export interface SynthPiece {
  readonly samples: Float32Array
  readonly sampleRate: number
}

/**
 * One host segment becomes one PCM buffer.
 * `synth` is called once per sentence with that language's model speed, never above 1.5 for Chinese.
 */
export function renderSpeech(
  text: string,
  speed: number,
  synth: (sentence: string, lang: 'zh' | 'en', modelSpeed: number) => SynthPiece,
): SynthPiece {
  const plan = planSpeeds(speed)
  const parts: Float32Array[] = []
  let rate = 22050
  let pendingGap = 0
  for (const piece of prepare(text)) {
    const modelSpeed = piece.lang === 'en' ? plan.modelEn : plan.modelZh
    for (const sentence of splitSentences(piece.text, piece.lang)) {
      const rendered = synth(sentence, piece.lang, modelSpeed)
      if (rendered.samples.length === 0) {
        pendingGap = Math.max(pendingGap, gapFor(sentence, modelSpeed))
        continue
      }
      rate = rendered.sampleRate
      if (pendingGap) parts.push(silence(pendingGap, rate))
      parts.push(trimSilence(rendered.samples, rendered.sampleRate))
      pendingGap = gapFor(sentence, modelSpeed)
    }
  }
  let samples = concatAudio(parts)
  if (plan.solaRatio > 1.02 && samples.length > 0) samples = sola(samples, rate, plan.solaRatio)
  return { samples, sampleRate: rate }
}

/**
 * The same assembly, one awaited sentence at a time.
 * Electron-as-Node cannot take sherpa's synchronous `generate()` result: the native
 * addon hands back an external ArrayBuffer, which Electron rejects. The async path
 * delivers PCM through `onProgress`, and this is what the child uses in production.
 */
export async function renderSpeechAsync(
  text: string,
  speed: number,
  synth: (sentence: string, lang: 'zh' | 'en', modelSpeed: number) => Promise<SynthPiece>,
): Promise<SynthPiece> {
  const plan = planSpeeds(speed)
  const parts: Float32Array[] = []
  let rate = 22050
  let pendingGap = 0
  for (const piece of prepare(text)) {
    const modelSpeed = piece.lang === 'en' ? plan.modelEn : plan.modelZh
    for (const sentence of splitSentences(piece.text, piece.lang)) {
      const rendered = await synth(sentence, piece.lang, modelSpeed)
      if (rendered.samples.length === 0) {
        pendingGap = Math.max(pendingGap, gapFor(sentence, modelSpeed))
        continue
      }
      rate = rendered.sampleRate
      if (pendingGap) parts.push(silence(pendingGap, rate))
      parts.push(trimSilence(rendered.samples, rendered.sampleRate))
      pendingGap = gapFor(sentence, modelSpeed)
    }
  }
  let samples = concatAudio(parts)
  if (plan.solaRatio > 1.02 && samples.length > 0) samples = sola(samples, rate, plan.solaRatio)
  return { samples, sampleRate: rate }
}

function silence(ms: number, rate: number): Float32Array {
  return new Float32Array(Math.max(0, Math.round((ms / 1000) * rate)))
}

function concatAudio(parts: readonly Float32Array[]): Float32Array {
  let total = 0
  for (const part of parts) total += part.length
  const out = new Float32Array(total)
  let offset = 0
  for (const part of parts) {
    out.set(part, offset)
    offset += part.length
  }
  return out
}
