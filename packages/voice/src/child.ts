/**
 * Voice child process.
 * One microphone stays open. Wake and command only change who receives the samples.
 * SenseVoice decode runs on a worker thread. This thread resamples, mixes, and runs VAD.
 */

import { createRequire } from 'node:module'
import { createInterface } from 'node:readline'
import { Worker } from 'node:worker_threads'
import { existsSync, writeFileSync, writeSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { contextFromFiles, keywordLines } from './keywords.ts'
import { LevelMeter } from './level.ts'
import { type VoiceSettings } from './settings.ts'

const require = createRequire(import.meta.url)
const TARGET_RATE = 16000
const RING_SAMPLES = TARGET_RATE / 2

interface ConfigureMessage {
  readonly type: 'configure'
  readonly settings?: VoiceSettings
  readonly paths?: {
    readonly kws?: string
    readonly asrModel?: string
    readonly asrTokens?: string
    readonly asrVad?: string
    readonly tts?: string
  }
}

type ListenMode = 'off' | 'wake' | 'command'

const emit = (message: unknown) => {
  // A pipe buffers process.stdout, so the host would not see a wake or a
  // playback edge until the buffer filled. The protocol is one line at a time.
  writeSync(1, `${JSON.stringify(message)}\n`)
}

const fail = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error)
  process.stderr.write(`dsh-orb voice: ${message}\n`)
}

class Ring {
  private readonly samples = new Float32Array(RING_SAMPLES)
  private writeAt = 0
  private filled = 0

  push(chunk: Float32Array): void {
    for (let i = 0; i < chunk.length; i += 1) {
      this.samples[this.writeAt] = chunk[i] ?? 0
      this.writeAt = (this.writeAt + 1) % RING_SAMPLES
      if (this.filled < RING_SAMPLES) this.filled += 1
    }
  }

  /** The newest `ms` of audio, in order. */
  last(ms: number): Float32Array {
    const count = Math.min(this.filled, Math.round((TARGET_RATE * ms) / 1000))
    const out = new Float32Array(count)
    const start = (this.writeAt - count + RING_SAMPLES) % RING_SAMPLES
    for (let i = 0; i < count; i += 1) out[i] = this.samples[(start + i) % RING_SAMPLES] ?? 0
    return out
  }

  /** Forget pre-playback audio, so the next command does not inherit the speaker's echo. */
  clear(): void {
    this.writeAt = 0
    this.filled = 0
  }
}

class VadEar {
  private detector: { acceptWaveform(samples: Float32Array): void, isDetected(): boolean, isEmpty(): boolean, front(copy: boolean): { start: number, samples: Float32Array }, pop(): void, flush(): void }
  private readonly frameSize = 512
  private readonly padSamples: number
  private readonly minSilenceSamples: number
  private absFed = 0
  private carry = new Float32Array(0)
  private history: { abs: number, samples: Float32Array }[] = []
  private lastEnd = -Infinity
  private detected = false
  private preroll: Float32Array | undefined
  private readonly onSpeech: (open: boolean) => void
  private readonly onSegment: (samples: Float32Array) => void

  constructor(vad: VadEar['detector'], padSeconds: number, minSilence: number, onSpeech: (open: boolean) => void, onSegment: (samples: Float32Array) => void) {
    this.detector = vad
    this.padSamples = Math.round(padSeconds * TARGET_RATE)
    this.minSilenceSamples = Math.round(minSilence * TARGET_RATE)
    this.onSpeech = onSpeech
    this.onSegment = onSegment
  }

  /** Keep the audio from just before the switch, and attach it to the next phrase only. */
  seed(samples: Float32Array): void {
    if (samples.length === 0) return
    this.preroll = samples
  }

  push(samples: Float32Array): void {
    if (samples.length === 0) return
    this.history.push({ abs: this.absFed, samples })
    this.absFed += samples.length
    const all = this.carry.length ? concat(this.carry, samples) : samples
    let index = 0
    for (; index + this.frameSize <= all.length; index += this.frameSize) {
      this.detector.acceptWaveform(all.subarray(index, index + this.frameSize))
      this.noteDetected()
      this.drain()
    }
    this.carry = all.slice(index)
    this.trim()
  }

  private noteDetected(): void {
    const now = this.detector.isDetected()
    if (now === this.detected) return
    this.detected = now
    // Both edges matter: the host uses the close edge to unpause its idle clock even
    // when the segment was too short to produce an utterance.
    this.onSpeech(now)
  }

  /** The listening mode changed away from commands. Drop state that must not leak into the next phrase. */
  reset(): void {
    const wasSpeaking = this.detected
    this.detected = false
    this.preroll = undefined
    this.carry = new Float32Array(0)
    this.history = []
    this.lastEnd = -Infinity
    // Discard a segment the old mode had already produced; it must not become an utterance
    // after the mode changed.
    while (!this.detector.isEmpty()) this.detector.pop()
    if (wasSpeaking) this.onSpeech(false)
  }

  private drain(): void {
    while (!this.detector.isEmpty()) {
      const segment = this.detector.front(false)
      const start = segment.start
      const end = start + segment.samples.length
      let speech = segment.samples
      const gap = start - this.lastEnd
      const needsPad = this.padSamples > 0 && (this.lastEnd === -Infinity || gap >= this.minSilenceSamples)
      if (this.preroll && this.preroll.length > 0) {
        speech = concat(this.preroll, speech)
        this.preroll = undefined
      } else if (needsPad) {
        const head = this.slice(Math.max(0, start - this.padSamples), start)
        if (head.length) speech = concat(head, segment.samples)
      }
      this.lastEnd = end
      this.detector.pop()
      this.onSegment(speech)
    }
  }

  private slice(from: number, to: number): Float32Array {
    const parts: Float32Array[] = []
    for (const chunk of this.history) {
      const start = Math.max(chunk.abs, from)
      const end = Math.min(chunk.abs + chunk.samples.length, to)
      if (end > start) parts.push(chunk.samples.subarray(start - chunk.abs, end - chunk.abs))
    }
    return concat(...parts)
  }

  private trim(): void {
    const keepFrom = this.absFed - (30 + 0.3 + 1) * TARGET_RATE
    while (this.history.length > 0) {
      const first = this.history[0]
      if (!first || first.abs + first.samples.length >= keepFrom) break
      this.history.shift()
    }
  }
}

function concat(...parts: Float32Array[]): Float32Array {
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

function toMono(data: Float32Array, channels: number): Float32Array {
  if (channels <= 1) return data
  const frames = Math.floor(data.length / channels)
  const out = new Float32Array(frames)
  for (let frame = 0; frame < frames; frame += 1) {
    let sum = 0
    for (let channel = 0; channel < channels; channel += 1) sum += data[frame * channels + channel] ?? 0
    out[frame] = sum / channels
  }
  return out
}

interface Native {
  sherpa: any
  cpal: any
}

function loadNative(): Native | undefined {
  try {
    return { sherpa: require('sherpa-onnx-node'), cpal: require('node-cpal') }
  } catch (error) {
    fail(error)
    return undefined
  }
}

class Engine {
  private mode: ListenMode = 'off'
  private settings: VoiceSettings | undefined
  private paths: ConfigureMessage['paths']
  private readonly ring = new Ring()
  private kws: any
  private kwsStream: any
  private kwsKey = ''
  private lastWake = 0
  private vad: VadEar | undefined
  private worker: Worker | undefined
  private workerReady = false
  private jobs: Float32Array[] = []
  private decoding = false
  private jobId = 0
  private readonly pending = new Map<number, true>()
  private input: { close(): void, play(): void } | undefined
  private resampler: { resample(samples: Float32Array): Float32Array } | undefined
  private channels = 1
  private audioHost: any
  private ttsWorker: Worker | undefined
  private readonly ttsWait = new Map<number, (message: { samples?: ArrayBuffer, sampleRate?: number, error?: string }) => void>()
  private ttsSeq = 0
  private speakToken = 0
  /** A segment accepted by the synthesizer and not yet handed to the speaker. */
  private armed: { id: string, token: number } | undefined
  private player: { stop(): void } | undefined
  /** Smoothed microphone level for the input meter. Commands only; never wake or playback. */
  private readonly meter = new LevelMeter()

  constructor(private readonly native: Native) {}

  configure(message: ConfigureMessage): void {
    this.settings = message.settings
    this.paths = message.paths
    // Build the recognizers before the microphone callback starts. Loading them
    // on the audio thread makes CoreAudio drop the stream.
    this.ensureKws()
    this.ensureAsr()
    this.startMic()
  }

  listen(mode: ListenMode, seedMs: number): void {
    const previous = this.mode
    this.mode = mode
    if (previous === 'command' && mode !== 'command') this.vad?.reset()
    if (mode === 'wake' && previous !== 'wake' && this.kws && this.kwsStream) this.kws.reset(this.kwsStream)
    if (mode === 'command' && previous !== 'command') {
      this.meter.reset()
    } else if (previous === 'command' && mode !== 'command') {
      // Put the meter down before the page hears the mode change.
      emit({ type: 'level', value: 0 })
    }
    if (mode === 'command' && previous !== 'command' && seedMs > 0) this.vad?.seed(this.ring.last(seedMs))
  }

  speak(id: string, text: string): void {
    const token = ++this.speakToken
    const speed = this.settings?.ttsSpeed ?? 1.5
    const worker = this.ensureTts()
    if (!worker) {
      emit({ type: 'playback', id, phase: 'start' })
      emit({ type: 'playback', id, phase: 'end' })
      return
    }
    this.armed = { id, token }
    const job = ++this.ttsSeq
    worker.postMessage({ id: job, text, speed })
    this.ttsWait.set(job, (message) => {
      if (token !== this.speakToken) return
      if (this.armed?.token === token) this.armed = undefined
      const samples = message.samples ? new Float32Array(message.samples) : new Float32Array(0)
      const sampleRate = message.sampleRate ?? 22050
      if (message.error || samples.length === 0) {
        if (message.error) fail(new Error(message.error))
        emit({ type: 'playback', id, phase: 'start' })
        emit({ type: 'playback', id, phase: 'end' })
        return
      }
      emit({ type: 'playback', id, phase: 'start' })
      try {
        this.player = playPcm(this.native.cpal, this.ensureHost(), samples, sampleRate, (stopped) => {
          this.player = undefined
          // The command that follows must not seed the recognizer with the speaker's own tail.
          this.ring.clear()
          if (token !== this.speakToken && !stopped) return
          emit({ type: 'playback', id, phase: 'end', ...(stopped ? { stopped: true } : {}) })
        })
      } catch (error) {
        fail(error)
        this.ring.clear()
        emit({ type: 'playback', id, phase: 'end' })
      }
    })
  }

  stopSpeak(): void {
    this.speakToken += 1
    const armed = this.armed
    this.armed = undefined
    const player = this.player
    this.player = undefined
    this.ring.clear()
    if (player) player.stop()
    else if (armed) emit({ type: 'playback', id: armed.id, phase: 'end', stopped: true })
  }

  startMic(): void {
    if (this.input) return
    try {
      const { cpal, sherpa } = this.native
      const device = this.ensureHost().defaultInputDevice()
      if (!device) throw new Error('no input device')
      const capture = pickCapture(cpal, device)
      this.channels = capture.channels
      this.resampler = capture.needsResample ? new sherpa.LinearResampler(capture.rate, TARGET_RATE) : undefined
      const stream = device.buildInputStream(
        capture.config,
        cpal.SampleFormat.F32,
        (data: Float32Array) => this.onAudio(data),
        (error: unknown) => this.onInputError(error),
      )
      stream.play()
      this.input = stream
      emit({ type: 'mic', open: true })
    } catch (error) {
      fail(error)
      emit({ type: 'mic', open: false })
    }
  }

  close(): void {
    this.stopSpeak()
    try { this.input?.close() } catch { /* already closed */ }
    void this.worker?.terminate()
    void this.ttsWorker?.terminate()
  }

  /** A late callback is not a missing microphone. Permission and device failures are. */
  private onInputError(error: unknown): void {
    const message = error instanceof Error ? error.message : String(error)
    fail(error)
    if (message.includes('underrun') || message.includes('overrun')) {
      try { this.input?.play() } catch (playError) { fail(playError) }
      return
    }
    emit({ type: 'mic', open: false })
  }

  private ensureHost(): any {
    this.audioHost ??= this.native.cpal.defaultHost()
    return this.audioHost
  }

  private ensureTts(): Worker | undefined {
    if (this.ttsWorker) return this.ttsWorker
    const root = this.paths?.tts
    if (!root) return undefined
    const beside = new URL('./tts-worker.js', import.meta.url)
    const source = new URL('./tts-worker.ts', import.meta.url)
    const url = existsSync(fileURLToPath(beside)) ? beside : source
    let worker: Worker
    try {
      worker = new Worker(url, { workerData: { tts: root } })
    } catch (error) {
      fail(error)
      return undefined
    }
    worker.on('message', (message: { id?: number, samples?: ArrayBuffer, sampleRate?: number, error?: string }) => {
      if (typeof message.id !== 'number') return
      const done = this.ttsWait.get(message.id)
      this.ttsWait.delete(message.id)
      done?.(message)
    })
    worker.on('error', (error) => {
      fail(error)
      for (const done of this.ttsWait.values()) done({ error: error.message })
      this.ttsWait.clear()
      this.ttsWorker = undefined
    })
    this.ttsWorker = worker
    return worker
  }

  private onAudio(data: Float32Array): void {
    let mono = toMono(data, this.channels)
    if (this.resampler) mono = this.resampler.resample(mono)
    this.ring.push(mono)
    if (this.mode === 'wake') {
      this.feedWake(mono)
      return
    }
    if (this.mode !== 'command') return
    const level = this.meter.push(mono, Date.now())
    if (level !== undefined) emit({ type: 'level', value: level })
    this.vad?.push(mono)
  }

  private feedWake(samples: Float32Array): void {
    const spotter = this.kws
    const stream = this.kwsStream
    if (!spotter || !stream) return
    stream.acceptWaveform({ sampleRate: TARGET_RATE, samples })
    while (spotter.isReady(stream)) {
      spotter.decode(stream)
      const result = spotter.getResult(stream)
      if (!result?.keyword) continue
      spotter.reset(stream)
      const now = Date.now()
      const cooldown = this.settings?.wakeCooldownMs ?? 1500
      if (now - this.lastWake < cooldown) continue
      this.lastWake = now
      emit({ type: 'wake' })
    }
  }

  private ensureKws(): void {
    const settings = this.settings
    const dir = this.paths?.kws
    if (!settings?.wakeEnabled || !dir) {
      this.clearKws()
      return
    }
    const files = kwsFiles(dir, settings.wakeChunk)
    if (!files || !existsSync(files.tokens)) {
      this.clearKws()
      return
    }
    let lines: string[] = []
    try {
      lines = keywordLines(settings.wakeWords, contextFromFiles(dir))
    } catch (error) {
      fail(error)
      // The configured phrase cannot be built. Keeping the previous list would make the
      // removed phrase keep waking the ball.
      this.clearKws()
      return
    }
    // An empty list means the user removed every wake word. Keeping the spotter built from
    // the old list would still fire on the old phrase.
    if (lines.length === 0) {
      this.clearKws()
      return
    }
    const key = `${settings.wakeChunk}:${settings.wakeThreshold}:${settings.wakeScore}:${lines.join('|')}`
    if (key === this.kwsKey && this.kws) return
    const keywordsFile = join(tmpdir(), `dsh-orb-kws-${process.pid}.txt`)
    writeFileSync(keywordsFile, `${lines.join('\n')}\n`)
    try {
      const spotter = new this.native.sherpa.KeywordSpotter({
        featConfig: { sampleRate: TARGET_RATE, featureDim: 80 },
        modelConfig: {
          transducer: { encoder: files.encoder, decoder: files.decoder, joiner: files.joiner },
          tokens: files.tokens,
          numThreads: 2,
          provider: 'cpu',
          debug: 0,
        },
        keywordsFile,
        keywordsScore: settings.wakeScore,
        keywordsThreshold: settings.wakeThreshold,
      })
      this.kws = spotter
      this.kwsStream = spotter.createStream()
      this.kwsKey = key
    } catch (error) {
      fail(error)
      this.clearKws()
    }
  }

  private clearKws(): void {
    this.kws = undefined
    this.kwsStream = undefined
    this.kwsKey = ''
  }

  private ensureAsr(): void {
    const model = this.paths?.asrModel
    const tokens = this.paths?.asrTokens
    const vadModel = this.paths?.asrVad
    if (!this.settings?.commandEnabled || !model || !tokens || !vadModel) return
    if (!existsSync(model) || !existsSync(tokens) || !existsSync(vadModel)) return
    if (!this.vad) {
      try {
        const detector = new this.native.sherpa.Vad({
          sileroVad: {
            model: vadModel,
            threshold: 0.5,
            minSilenceDuration: 0.5,
            minSpeechDuration: 0.25,
            maxSpeechDuration: 30,
            windowSize: 512,
          },
          sampleRate: TARGET_RATE,
          numThreads: 1,
          provider: 'cpu',
          debug: 0,
        }, 31.5)
        this.vad = new VadEar(detector, 0.3, 0.5, (open) => {
          emit({ type: 'speech', open })
        }, (samples) => this.enqueue(samples))
      } catch (error) {
        fail(error)
      }
    }
    if (this.worker) return
    let worker: Worker
    try {
      worker = new Worker(new URL('./decode-worker.mjs', import.meta.url), { workerData: { model, tokens } })
    } catch (error) {
      fail(error)
      return
    }
    worker.on('message', (message: { ready?: boolean, id?: number, text?: string, error?: string }) => {
      if (message.ready) {
        this.workerReady = true
        this.pump()
        return
      }
      this.decoding = false
      if (typeof message.id === 'number') this.pending.delete(message.id)
      if (message.error) fail(message.error)
      else if (message.text) emit({ type: 'utterance', text: message.text })
      emit({ type: 'speech', open: false })
      this.pump()
    })
    worker.on('error', (error) => fail(error))
    this.worker = worker
  }

  private enqueue(samples: Float32Array): void {
    const copy = new Float32Array(samples)
    this.jobs.push(copy)
    this.pump()
  }

  private pump(): void {
    if (!this.workerReady || this.decoding || this.jobs.length === 0 || !this.worker) return
    const samples = this.jobs.shift()
    if (!samples) return
    this.decoding = true
    const id = ++this.jobId
    this.pending.set(id, true)
    const bytes = new ArrayBuffer(samples.byteLength)
    new Uint8Array(bytes).set(new Uint8Array(samples.buffer, samples.byteOffset, samples.byteLength))
    this.worker.postMessage({ id, samples: bytes }, [bytes])
  }
}

function kwsFiles(dir: string, chunk: 8 | 16): { encoder: string, decoder: string, joiner: string, tokens: string } | undefined {
  const tag = `chunk-${chunk}`
  const files = {
    encoder: join(dir, `encoder-epoch-13-avg-2-${tag}-left-64.int8.onnx`),
    decoder: join(dir, `decoder-epoch-13-avg-2-${tag}-left-64.onnx`),
    joiner: join(dir, `joiner-epoch-13-avg-2-${tag}-left-64.int8.onnx`),
    tokens: join(dir, 'tokens.txt'),
  }
  if (!existsSync(files.encoder) || !existsSync(files.decoder) || !existsSync(files.joiner)) return undefined
  return files
}

function playPcm(
  cpal: any,
  host: any,
  samples: Float32Array,
  sampleRate: number,
  onEnded: (stopped: boolean) => void,
): { stop(): void } {
  const device = host.defaultOutputDevice()
  if (!device) {
    onEnded(false)
    return { stop() {} }
  }
  const chosen = pickOutput(cpal, device, sampleRate)
  const config = chosen.config
  const pcm = chosen.rate === sampleRate ? samples : resampleLinear(samples, sampleRate, chosen.rate)
  let cursor = 0
  let ended = false
  let stream: { close(): void, play(): void }
  const finish = (stopped: boolean) => {
    if (ended) return
    ended = true
    try { stream.close() } catch { /* already closed */ }
    onEnded(stopped)
  }
  stream = device.buildOutputStream(
    config,
    cpal.SampleFormat.F32,
    (data: Float32Array) => {
      const channels = config.channels
      const frames = Math.floor(data.length / channels)
      for (let frame = 0; frame < frames; frame += 1) {
        const sample = cursor < pcm.length ? pcm[cursor] ?? 0 : 0
        for (let channel = 0; channel < channels; channel += 1) data[frame * channels + channel] = sample
        cursor += 1
      }
      if (cursor >= pcm.length) setImmediate(() => finish(false))
    },
    (error: unknown) => {
      fail(error)
      finish(true)
    },
  )
  stream.play()
  return { stop() { finish(true) } }
}

function pickOutput(cpal: any, device: any, sampleRate: number): { config: { channels: number, sampleRate: number }, rate: number } {
  const ranges = [...device.supportedOutputConfigs()]
  const f32 = ranges.filter((range: any) => range.sampleFormat() === cpal.SampleFormat.F32)
  const exact = f32.find((range: any) => range.channels() === 1 && range.containsRate(sampleRate))
    ?? f32.find((range: any) => range.containsRate(sampleRate))
  if (exact) {
    const supported = exact.tryWithSampleRate?.(sampleRate) ?? exact
    const config = typeof supported.config === 'function' ? supported.config() : new cpal.StreamConfig({
      channels: exact.channels(),
      sampleRate,
      bufferSize: cpal.BufferSize.Default,
    })
    return { config, rate: config.sampleRate ?? sampleRate }
  }
  const fallback = device.defaultOutputConfig()
  return { config: fallback.config(), rate: fallback.config().sampleRate }
}

function resampleLinear(samples: Float32Array, from: number, to: number): Float32Array {
  if (from === to || samples.length === 0) return samples
  const length = Math.max(1, Math.round((samples.length * to) / from))
  const out = new Float32Array(length)
  for (let i = 0; i < length; i += 1) {
    const position = (i * from) / to
    const left = Math.floor(position)
    const right = Math.min(left + 1, samples.length - 1)
    const mix = position - left
    out[i] = (samples[left] ?? 0) + ((samples[right] ?? 0) - (samples[left] ?? 0)) * mix
  }
  return out
}

function pickCapture(cpal: any, device: any): { config: unknown, channels: number, rate: number, needsResample: boolean } {
  const ranges = [...device.supportedInputConfigs()]
  const f32 = ranges.filter((range: any) => range.sampleFormat() === cpal.SampleFormat.F32)
  const exact = f32.find((range: any) => range.channels() === 1 && range.containsRate(TARGET_RATE))
    ?? f32.find((range: any) => range.containsRate(TARGET_RATE))
  if (exact) {
    return {
      config: new cpal.StreamConfig({ channels: exact.channels(), sampleRate: TARGET_RATE, bufferSize: cpal.BufferSize.Default }),
      channels: exact.channels(),
      rate: TARGET_RATE,
      needsResample: false,
    }
  }
  const fallback = device.defaultInputConfig()
  const config = fallback.config()
  return { config, channels: config.channels, rate: config.sampleRate, needsResample: config.sampleRate !== TARGET_RATE }
}

function main(): void {
  const native = loadNative()
  const engine = native ? new Engine(native) : undefined
  if (!engine) emit({ type: 'mic', open: false })

  const lines = createInterface({ input: process.stdin })
  lines.on('line', (line) => {
    let message: { type?: string, mode?: ListenMode, seedMs?: number, id?: string, settings?: VoiceSettings, paths?: ConfigureMessage['paths'] }
    try {
      message = JSON.parse(line) as typeof message
    } catch {
      return
    }
    try {
      if (message.type === 'configure') {
        engine?.configure(message as ConfigureMessage)
        return
      }
      if (message.type === 'listen' && (message.mode === 'off' || message.mode === 'wake' || message.mode === 'command')) {
        engine?.listen(message.mode, message.seedMs ?? 0)
        return
      }
      if (message.type === 'speak' && typeof message.id === 'string') {
        const spoken = typeof (message as { text?: unknown }).text === 'string' ? (message as { text: string }).text : ''
        if (engine) engine.speak(message.id, spoken)
        else {
          emit({ type: 'playback', id: message.id, phase: 'start' })
          emit({ type: 'playback', id: message.id, phase: 'end' })
        }
        return
      }
      if (message.type === 'stop-speak') engine?.stopSpeak()
    } catch (error) {
      // One bad command must not take the microphone down for the rest of the session.
      fail(error)
      // A play request that never started still needs its end, or the host queue waits forever.
      if (message.type === 'speak' && typeof message.id === 'string') {
        emit({ type: 'playback', id: message.id, phase: 'end' })
      }
    }
  })
  lines.on('close', () => {
    try { engine?.close() } catch { /* native streams may already be gone */ }
    process.exit(0)
  })
  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    // Closing the microphone from a signal handler throws inside the native addon
    // and aborts the process. Exiting lets the operating system release the device.
    process.on(signal, () => { process.exit(0) })
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main()
