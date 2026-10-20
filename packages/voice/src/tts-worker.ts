/**
 * Matcha runs here so a synthesis cannot block the microphone callback.
 * The main thread sends one finished segment. This thread cleans, splits,
 * synthesizes, and time-compresses it, then returns one PCM buffer.
 *
 * Electron-as-Node cannot accept the synchronous `generate()` result: the native
 * addon returns an external ArrayBuffer and Electron rejects it with
 * "External buffers are not allowed". `generateAsync`'s progress callback still
 * delivers the PCM, so this worker collects those chunks and copies them into
 * ordinary V8 buffers before posting them back.
 */
import { createRequire } from 'node:module'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { parentPort, workerData } from 'node:worker_threads'
import { renderSpeechAsync, type SynthPiece } from './speak-text.ts'

const require = createRequire(import.meta.url)
const sherpa = require('sherpa-onnx-node')
const root = typeof workerData?.tts === 'string' ? workerData.tts : ''

interface OfflineTts {
  readonly sampleRate: number
  generateAsync?: (input: {
    text: string
    sid: number
    speed: number
    onProgress: (info: { samples: Float32Array | ArrayLike<number>, progress: number }) => number
  }) => Promise<{ samples: Float32Array | ArrayLike<number>, sampleRate?: number }>
  generate: (input: { text: string, sid: number, speed: number }) => { samples: Float32Array | ArrayLike<number>, sampleRate: number }
}

let chinese: OfflineTts | undefined
let english: OfflineTts | undefined

function engine(lang: 'zh' | 'en'): OfflineTts {
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
  }) as OfflineTts
  if (lang === 'en') english = tts
  else chinese = tts
  return tts
}

function copySamples(samples: Float32Array | ArrayLike<number>): Float32Array {
  const copy = new Float32Array(samples.length)
  copy.set(samples)
  return copy
}

async function synth(sentence: string, lang: 'zh' | 'en', modelSpeed: number): Promise<SynthPiece> {
  const tts = engine(lang)
  const sampleRate = Number(tts.sampleRate) > 0 ? Number(tts.sampleRate) : 22050
  if (typeof tts.generateAsync !== 'function') {
    const audio = tts.generate({ text: sentence, sid: 0, speed: modelSpeed })
    return { samples: copySamples(audio.samples), sampleRate: audio.sampleRate || sampleRate }
  }
  const chunks: Float32Array[] = []
  let settlement = ''
  try {
    const audio = await tts.generateAsync({
      text: sentence,
      sid: 0,
      speed: modelSpeed,
      onProgress: (info) => {
        if (info.samples && info.samples.length > 0) chunks.push(copySamples(info.samples))
        return 1
      },
    })
    if (chunks.length === 0 && audio.samples && audio.samples.length > 0) {
      chunks.push(copySamples(audio.samples))
    }
  } catch (error) {
    settlement = error instanceof Error ? error.message : String(error)
  }
  if (chunks.length === 0) {
    if (settlement) throw new Error(settlement)
    return { samples: new Float32Array(0), sampleRate }
  }
  // Electron reports this after the final progress chunk; the PCM is already complete.
  if (settlement && !settlement.includes('TTS settlement')) throw new Error(settlement)
  let total = 0
  for (const chunk of chunks) total += chunk.length
  const samples = new Float32Array(total)
  let offset = 0
  for (const chunk of chunks) {
    samples.set(chunk, offset)
    offset += chunk.length
  }
  return { samples, sampleRate }
}

interface Job {
  readonly id?: number
  readonly text?: string
  readonly speed?: number
}

const jobs: Job[] = []
let running = false

async function handle(job: Job): Promise<void> {
  const id = job.id
  if (typeof id !== 'number') return
  try {
    const rendered = await renderSpeechAsync(job.text ?? '', job.speed ?? 1.5, synth)
    const copy = new ArrayBuffer(rendered.samples.byteLength)
    new Float32Array(copy).set(rendered.samples)
    parentPort?.postMessage({ id, sampleRate: rendered.sampleRate, samples: copy }, [copy])
  } catch (error) {
    parentPort?.postMessage({ id, error: error instanceof Error ? error.message : String(error) })
  }
}

async function pump(): Promise<void> {
  if (running) return
  running = true
  try {
    while (jobs.length > 0) {
      const job = jobs.shift()
      if (job) await handle(job)
    }
  } finally {
    running = false
  }
}

parentPort?.on('message', (message: Job) => {
  if (typeof message?.id !== 'number') return
  jobs.push(message)
  void pump()
})
