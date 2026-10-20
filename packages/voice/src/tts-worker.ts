/**
 * Matcha runs here so a synthesis cannot block the microphone callback.
 * The main thread sends one finished segment. This thread cleans, splits,
 * synthesizes, and time-compresses it, then returns one PCM buffer.
 */
import { createRequire } from 'node:module'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { parentPort, workerData } from 'node:worker_threads'
import { renderSpeech } from './speak-text.ts'

const require = createRequire(import.meta.url)
const sherpa = require('sherpa-onnx-node')
const root = typeof workerData?.tts === 'string' ? workerData.tts : ''

let chinese: { generate(input: { text: string, sid: number, speed: number }): { samples: Float32Array | ArrayLike<number>, sampleRate: number } } | undefined
let english: typeof chinese

function engine(lang: 'zh' | 'en') {
  const cached = lang === 'en' ? english : chinese
  if (cached) return cached
  const dir = join(root, lang === 'en' ? 'matcha-icefall-en_US-ljspeech' : 'matcha-icefall-zh-baker')
  const acoustic = join(dir, 'model-steps-3.onnx')
  const vocoder = existsSync(join(dir, 'vocoder.onnx')) ? join(dir, 'vocoder.onnx') : join(root, 'vocos-22khz-univ.onnx')
  const tokens = join(dir, 'tokens.txt')
  const matcha: Record<string, unknown> = {
    acousticModel: acoustic,
    vocoder,
    tokens,
    numThreads: 4,
    provider: 'cpu',
  }
  if (lang === 'zh' && existsSync(join(dir, 'lexicon.txt'))) matcha.lexicon = join(dir, 'lexicon.txt')
  if (lang === 'en' && existsSync(join(dir, 'espeak-ng-data'))) matcha.dataDir = join(dir, 'espeak-ng-data')
  const ruleFsts = ['date.fst', 'number.fst', 'phone.fst']
    .map((name) => join(dir, name))
    .filter((file) => existsSync(file))
  const tts = new sherpa.OfflineTts({
    model: { matcha },
    maxNumSentences: 1,
    silenceScale: 0.2,
    ...(ruleFsts.length > 0 ? { ruleFsts: ruleFsts.join(',') } : {}),
  })
  try { tts.generate({ text: lang === 'en' ? 'warm up' : '预热', sid: 0, speed: 1.5 }) } catch { /* warmup is best-effort */ }
  if (lang === 'en') english = tts
  else chinese = tts
  return tts
}

function synth(sentence: string, lang: 'zh' | 'en', modelSpeed: number) {
  const audio = engine(lang).generate({ text: sentence, sid: 0, speed: modelSpeed })
  const samples = audio.samples instanceof Float32Array ? audio.samples : new Float32Array(audio.samples)
  return { samples, sampleRate: audio.sampleRate }
}

parentPort?.on('message', (message: { id?: number, text?: string, speed?: number }) => {
  const id = message.id
  if (typeof id !== 'number') return
  try {
    const rendered = renderSpeech(message.text ?? '', message.speed ?? 1.5, synth)
    const copy = new ArrayBuffer(rendered.samples.byteLength)
    new Float32Array(copy).set(rendered.samples)
    parentPort?.postMessage({ id, sampleRate: rendered.sampleRate, samples: copy }, [copy])
  } catch (error) {
    parentPort?.postMessage({ id, error: error instanceof Error ? error.message : String(error) })
  }
})
