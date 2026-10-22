/**
 * Voice choices stored in the profile.
 * A missing or unreadable file becomes these defaults. A field outside its
 * range is pulled back inside it; the other fields are kept.
 */

import {
  clampQwenSpeed,
  DEFAULT_QWEN_SPEED,
  DEFAULT_QWEN_VOICE,
  isQwenVoice,
} from './qwen.ts'
import { clampTtsVolume, DEFAULT_TTS_VOLUME } from './volume.ts'

export type TtsBackend = 'local' | 'qwen'

export interface VoiceSettings {
  wakeEnabled: boolean
  /** One phrase per entry. Empty means there is no wake word. */
  wakeWords: string[]
  /** 0.05–0.9. Factory 0.25. */
  wakeThreshold: number
  /** 0.5–4. Factory 1. */
  wakeScore: number
  /** Encoder chunk. 8 is 160 ms, 16 is 320 ms. */
  wakeChunk: 8 | 16
  /** 500–5000. Factory 1500. */
  wakeCooldownMs: number
  /** Spoken after a wake. Empty means silence. */
  wakeReply: string
  commandEnabled: boolean
  /** 执行和正文播报期间，整句带出这个词就算插话。空字符串表示执行和播报期间不听。 */
  interjectKeyword: string
  /** Whole-utterance dismiss phrases. Empty means dismiss is off. */
  dismissPhrases: string[]
  /** Spoken after dismiss. Empty means silence. */
  dismissReply: string
  ttsEnabled: boolean
  /** 播报用本地模型还是千问。出厂本地。 */
  ttsBackend: TtsBackend
  /** 手填的阿里云百炼 Key。空字符串表示没填；前后空白不算已填。 */
  qwenApiKey: string
  /** 千问音色，存 voice 原文（区分大小写，内部空格保留）。出厂 Cherry。 */
  qwenVoice: string
  /** 千问语速 0.5–2.0，步进 0.1。出厂 1.4，1.0 是原速。 */
  qwenSpeed: number
  /** Spoken when a question card opens. Empty means silence. */
  questionPrompt: string
  /** 1–3, step 0.1. Factory 1.5. */
  ttsSpeed: number
  /** 0–2, step 0.01. Shared by the local and Qwen speakers. Factory 1, the model's own level. */
  ttsVolume: number
  /** 5000–600000. Factory 30000. */
  idleMs: number
}

export const DEFAULT_VOICE_SETTINGS: VoiceSettings = {
  wakeEnabled: true,
  wakeWords: ['你好大肥鱼'],
  wakeThreshold: 0.25,
  wakeScore: 1,
  wakeChunk: 8,
  wakeCooldownMs: 1500,
  wakeReply: '我在',
  commandEnabled: true,
  interjectKeyword: '大肥鱼',
  dismissPhrases: ['你退下吧', '退下吧'],
  dismissReply: '好的，再见',
  ttsEnabled: true,
  ttsBackend: 'local',
  qwenApiKey: '',
  qwenVoice: DEFAULT_QWEN_VOICE,
  qwenSpeed: DEFAULT_QWEN_SPEED,
  questionPrompt: '我有几个问题，你来选一下',
  ttsSpeed: 1.5,
  ttsVolume: DEFAULT_TTS_VOLUME,
  idleMs: 30_000,
}

const PHRASE_LIMIT = 8
const PHRASE_CHARS = 40
const REPLY_CHARS = 80
const SECRET_CHARS = 300

/** Another part of the product treats an empty wake list as "no wake word at all". */
export function hasWakeWord(words: readonly string[]): boolean {
  return words.some((word) => word.trim() !== '')
}

/**
 * Whether the chosen speaker can take a sentence right now.
 * The TTS switch is user intent; readiness is the selected backend's own requirement.
 */
export function ttsReady(
  settings: Pick<VoiceSettings, 'ttsEnabled' | 'ttsBackend' | 'qwenApiKey'>,
  localTtsPresent: boolean,
): boolean {
  if (!settings.ttsEnabled) return false
  return settings.ttsBackend === 'qwen' ? settings.qwenApiKey.trim() !== '' : localTtsPresent
}

/** Replace anything unreadable or out of range. Missing fields keep the factory value. */
export function parseVoiceSettings(value: unknown): VoiceSettings {
  const item = record(value)
  if (item === undefined) return clone(DEFAULT_VOICE_SETTINGS)
  return {
    wakeEnabled: flag(item.wakeEnabled, DEFAULT_VOICE_SETTINGS.wakeEnabled),
    wakeWords: phrases(item.wakeWords, DEFAULT_VOICE_SETTINGS.wakeWords),
    wakeThreshold: numberIn(item.wakeThreshold, 0.05, 0.9, DEFAULT_VOICE_SETTINGS.wakeThreshold, 2),
    wakeScore: numberIn(item.wakeScore, 0.5, 4, DEFAULT_VOICE_SETTINGS.wakeScore, 2),
    wakeChunk: item.wakeChunk === 16 ? 16 : 8,
    wakeCooldownMs: numberIn(item.wakeCooldownMs, 500, 5000, DEFAULT_VOICE_SETTINGS.wakeCooldownMs, 0),
    wakeReply: text(item.wakeReply, DEFAULT_VOICE_SETTINGS.wakeReply, REPLY_CHARS),
    commandEnabled: flag(item.commandEnabled, DEFAULT_VOICE_SETTINGS.commandEnabled),
    interjectKeyword: text(item.interjectKeyword, DEFAULT_VOICE_SETTINGS.interjectKeyword, PHRASE_CHARS),
    dismissPhrases: phrases(item.dismissPhrases, DEFAULT_VOICE_SETTINGS.dismissPhrases),
    dismissReply: text(item.dismissReply, DEFAULT_VOICE_SETTINGS.dismissReply, REPLY_CHARS),
    ttsEnabled: flag(item.ttsEnabled, DEFAULT_VOICE_SETTINGS.ttsEnabled),
    ttsBackend: item.ttsBackend === 'qwen' ? 'qwen' : 'local',
    qwenApiKey: secret(item.qwenApiKey),
    qwenVoice: voiceName(item.qwenVoice),
    qwenSpeed: typeof item.qwenSpeed === 'number' ? clampQwenSpeed(item.qwenSpeed) : DEFAULT_QWEN_SPEED,
    questionPrompt: text(item.questionPrompt, DEFAULT_VOICE_SETTINGS.questionPrompt, REPLY_CHARS),
    ttsSpeed: numberIn(item.ttsSpeed, 1, 3, DEFAULT_VOICE_SETTINGS.ttsSpeed, 1),
    ttsVolume: typeof item.ttsVolume === 'number' ? clampTtsVolume(item.ttsVolume) : DEFAULT_TTS_VOLUME,
    idleMs: numberIn(item.idleMs, 5000, 600_000, DEFAULT_VOICE_SETTINGS.idleMs, 0),
  }
}

function clone(settings: VoiceSettings): VoiceSettings {
  return {
    ...settings,
    wakeWords: [...settings.wakeWords],
    dismissPhrases: [...settings.dismissPhrases],
  }
}

function record(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : undefined
}

function flag(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback
}

function text(value: unknown, fallback: string, max: number): string {
  if (typeof value !== 'string') return fallback
  return value.trim().slice(0, max)
}

/** A pasted key: surrounding whitespace is not "filled"; control characters would break the header. */
function secret(value: unknown): string {
  if (typeof value !== 'string') return ''
  return value.trim().replace(/[\u0000-\u001f\u007f]/g, '').slice(0, SECRET_CHARS)
}

/** Only a catalogue voice is stored; anything else falls back to the factory voice. */
function voiceName(value: unknown): string {
  if (typeof value !== 'string') return DEFAULT_QWEN_VOICE
  const trimmed = value.trim()
  return isQwenVoice(trimmed) ? trimmed : DEFAULT_QWEN_VOICE
}

function phrases(value: unknown, fallback: readonly string[]): string[] {
  if (!Array.isArray(value)) return [...fallback]
  const next: string[] = []
  for (const item of value) {
    if (typeof item !== 'string') continue
    const trimmed = item.trim().slice(0, PHRASE_CHARS)
    if (!trimmed || next.includes(trimmed)) continue
    next.push(trimmed)
    if (next.length >= PHRASE_LIMIT) break
  }
  return next
}

function numberIn(value: unknown, min: number, max: number, fallback: number, decimals: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback
  const factor = 10 ** decimals
  const rounded = Math.round(value * factor) / factor
  if (rounded < min) return min
  if (rounded > max) return max
  return rounded
}
