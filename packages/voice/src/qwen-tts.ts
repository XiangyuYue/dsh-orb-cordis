/**
 * Qwen realtime synthesis: one text segment in, PCM blocks out.
 * The caller plays each block as it arrives, so the sentence starts on the
 * first block instead of waiting for the whole synthesis.
 *
 * Protocol (Beijing region, `server_commit`): connect, `session.update`, wait
 * for `session.updated`, append the text once, finish, and read
 * `response.audio.delta` until `session.finished`. A cancel closes the socket,
 * which is what actually stops the cloud request.
 */

import { randomBytes } from 'node:crypto'
import { clampQwenSpeed, QWEN_SAMPLE_RATE, QWEN_TTS_URL } from './qwen.ts'
import { stripMarkdown } from './speak-text.ts'

export interface QwenSocketInit {
  readonly headers: Record<string, string>
}

/** The slice of a WebSocket this module uses. Tests supply their own. */
export interface QwenSocket {
  send(data: string): void
  close(): void
  onOpen(listener: () => void): void
  onMessage(listener: (data: string) => void): void
  onError(listener: (message: string) => void): void
  onClose(listener: () => void): void
}

export interface QwenSpeechOptions {
  readonly text: string
  readonly apiKey: string
  readonly voice: string
  readonly speed: number
  readonly onAudio: (samples: Float32Array, sampleRate: number) => void
  readonly onDone: () => void
  /** One request failure. Not called after {@link QwenSpeech.cancel}. */
  readonly onError?: (message: string) => void
  /** Fired before a no-audio request is retried with a fresh socket. */
  readonly onRetry?: (message: string, attempt: number) => void
  readonly connectTimeoutMs?: number
  /** How long to wait for the first PCM after the session is ready. */
  readonly firstAudioTimeoutMs?: number
  readonly idleTimeoutMs?: number
  /** Extra attempts after a timeout with no audio. Factory 1. */
  readonly retries?: number
  /** Test seam; production uses the runtime's global WebSocket. */
  readonly socket?: (url: string, init: QwenSocketInit) => QwenSocket
}

export interface QwenSpeech {
  cancel(): void
}

/** The service caps one request at 5000 characters; leave room for cleaning. */
export const QWEN_TEXT_LIMIT = 4000

const CONNECT_TIMEOUT_MS = 10_000
const FIRST_AUDIO_TIMEOUT_MS = 8_000
const IDLE_TIMEOUT_MS = 30_000
const RETRY_DELAY_MS = 300

/** Markdown out, one line of speakable text in. English stays in the same run. */
export function prepareQwenText(text: string): string {
  return stripMarkdown(String(text))
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Cut long text at sentence ends, then commas, then a hard boundary. */
export function splitQwenText(text: string, max = QWEN_TEXT_LIMIT): string[] {
  const source = text.trim()
  if (!source) return []
  const limit = Math.max(1, Math.floor(max))
  const chunks: string[] = []
  let rest = source
  while (rest.length > limit) {
    const window = rest.slice(0, limit)
    let cut = -1
    for (let i = window.length - 1; i >= Math.floor(limit * 0.5); i -= 1) {
      const char = window[i] ?? ''
      if ('。！？!?'.includes(char)) {
        cut = i + 1
        break
      }
      if (char === '.' && (i + 1 === window.length || /\s/.test(window[i + 1] ?? ''))) {
        cut = i + 1
        break
      }
    }
    if (cut < 0) {
      const breakAt = Math.max(
        window.lastIndexOf('，'),
        window.lastIndexOf(','),
        window.lastIndexOf('；'),
        window.lastIndexOf(';'),
        window.lastIndexOf(' '),
      )
      cut = breakAt > limit * 0.5 ? breakAt + 1 : limit
    }
    const head = rest.slice(0, cut).trim()
    if (head) chunks.push(head)
    rest = rest.slice(cut).trim()
  }
  if (rest) chunks.push(rest)
  return chunks
}

/** `session.update` for one connection. Voice and speed are fixed for this sentence. */
export function qwenSessionUpdate(voice: string, speed: number): Record<string, unknown> {
  return {
    mode: 'server_commit',
    voice,
    language_type: 'Chinese',
    response_format: 'pcm',
    sample_rate: QWEN_SAMPLE_RATE,
    speech_rate: clampQwenSpeed(speed),
  }
}

/** Base64 of 16-bit little-endian mono PCM into normalised floats. */
export function decodeQwenPcm(delta: string): Float32Array {
  const bytes = Buffer.from(delta, 'base64')
  const count = Math.floor(bytes.length / 2)
  const samples = new Float32Array(count)
  for (let i = 0; i < count; i += 1) samples[i] = bytes.readInt16LE(i * 2) / 32768
  return samples
}

export function eventId(): string {
  return `event_${randomBytes(16).toString('hex')}`
}

/**
 * Speak one queue item. Text longer than one request is sent as ordered
 * segments over one playback; `onDone` fires after the last segment.
 */
export function speakQwen(options: QwenSpeechOptions): QwenSpeech {
  const apiKey = options.apiKey.trim()
  const segments = splitQwenText(prepareQwenText(options.text))
  const connectTimeoutMs = options.connectTimeoutMs ?? CONNECT_TIMEOUT_MS
  const firstAudioTimeoutMs = options.firstAudioTimeoutMs ?? FIRST_AUDIO_TIMEOUT_MS
  const idleTimeoutMs = options.idleTimeoutMs ?? IDLE_TIMEOUT_MS
  const retries = Math.max(0, Math.floor(options.retries ?? 1))
  let settled = false
  let current: { close(): void } | undefined

  const fail = (message: string): void => {
    if (settled) return
    settled = true
    current = undefined
    const text = message.trim() === '' ? '千问语音合成失败' : message
    options.onError?.(redact(text, apiKey))
  }

  const complete = (): void => {
    if (settled) return
    settled = true
    current = undefined
    options.onDone()
  }

  const start = (index: number, retry = 0): void => {
    if (settled) return
    const text = segments[index]
    if (text === undefined) {
      complete()
      return
    }
    let gotAudio = false
    current = openSegment(text, {
      apiKey,
      voice: options.voice,
      speed: options.speed,
      connectTimeoutMs,
      firstAudioTimeoutMs,
      idleTimeoutMs,
      socket: options.socket,
      onAudio: (samples, sampleRate) => {
        gotAudio = true
        options.onAudio(samples, sampleRate)
      },
      onComplete: () => start(index + 1),
      onFailure: (message, retryable) => {
        if (settled) return
        // The service occasionally accepts the session and then sends no PCM. Retrying a
        // fresh socket is safe only if this attempt produced no audio; otherwise the
        // sentence would repeat from the beginning.
        if (retryable && !gotAudio && retry < retries) {
          current = undefined
          options.onRetry?.(message, retry + 1)
          setTimeout(() => { if (!settled) start(index, retry + 1) }, RETRY_DELAY_MS)
          return
        }
        fail(message)
      },
    })
  }

  if (segments.length === 0) {
    queueMicrotask(() => { if (!settled) complete() })
  } else {
    start(0)
  }

  return {
    cancel() {
      if (settled) return
      settled = true
      const active = current
      current = undefined
      active?.close()
    },
  }
}

interface SegmentOptions {
  readonly apiKey: string
  readonly voice: string
  readonly speed: number
  readonly connectTimeoutMs: number
  readonly firstAudioTimeoutMs: number
  readonly idleTimeoutMs: number
  readonly socket?: (url: string, init: QwenSocketInit) => QwenSocket
  readonly onAudio: (samples: Float32Array, sampleRate: number) => void
  readonly onComplete: () => void
  /** `retryable` is true only for a timeout that produced no audio. */
  readonly onFailure: (message: string, retryable: boolean) => void
}

/** One connection for one text segment. All callbacks fire at most once. */
function openSegment(text: string, options: SegmentOptions): { close(): void } {
  let socket: QwenSocket
  try {
    socket = (options.socket ?? defaultSocket)(QWEN_TTS_URL, {
      headers: { Authorization: `Bearer ${options.apiKey}` },
    })
  } catch (error) {
    options.onFailure(error instanceof Error ? error.message : String(error), false)
    return { close() {} }
  }

  let settled = false
  let sentText = false
  let gotAudio = false
  let timer: ReturnType<typeof setTimeout> | undefined

  const clearTimer = (): void => {
    if (timer !== undefined) clearTimeout(timer)
    timer = undefined
  }

  /** Returns false when this segment already settled; late socket events are then ignored. */
  const take = (): boolean => {
    if (settled) return false
    settled = true
    clearTimer()
    return true
  }

  const close = (): void => {
    if (!take()) return
    try { socket.close() } catch { /* the peer may already be gone */ }
  }

  const fail = (message: string, retryable = false): void => {
    if (!take()) return
    try { socket.close() } catch { /* the peer may already be gone */ }
    options.onFailure(message, retryable)
  }

  const complete = (): void => {
    if (!take()) return
    try { socket.close() } catch { /* the peer may already be gone */ }
    options.onComplete()
  }

  const arm = (ms: number): void => {
    clearTimer()
    timer = setTimeout(() => fail('千问语音合成超时', true), ms)
    timer.unref?.()
  }

  const send = (payload: Record<string, unknown>): void => {
    socket.send(JSON.stringify({ event_id: eventId(), ...payload }))
  }

  socket.onOpen(() => {
    if (settled) return
    try {
      send({ type: 'session.update', session: qwenSessionUpdate(options.voice, options.speed) })
    } catch (error) {
      fail(error instanceof Error ? error.message : String(error))
    }
  })

  socket.onMessage((data) => {
    if (settled) return
    arm(gotAudio ? options.idleTimeoutMs : options.firstAudioTimeoutMs)
    let parsed: unknown
    try {
      parsed = JSON.parse(data) as unknown
    } catch {
      return
    }
    if (typeof parsed !== 'object' || parsed === null) return
    const message = parsed as Record<string, unknown>
    const type = message.type
    if (type === 'error') {
      const error = message.error
      const detail = typeof error === 'object' && error !== null && 'message' in error
        ? String((error as { message?: unknown }).message ?? '')
        : ''
      fail(detail || '千问语音合成失败')
      return
    }
    if (type === 'session.updated') {
      if (sentText) return
      sentText = true
      try {
        send({ type: 'input_text_buffer.append', text })
        send({ type: 'session.finish' })
      } catch (error) {
        fail(error instanceof Error ? error.message : String(error))
        return
      }
      arm(options.firstAudioTimeoutMs)
      return
    }
    if (type === 'response.audio.delta') {
      const delta = message.delta
      if (typeof delta !== 'string' || delta === '') return
      try {
        const samples = decodeQwenPcm(delta)
        if (samples.length > 0) {
          gotAudio = true
          options.onAudio(samples, QWEN_SAMPLE_RATE)
          arm(options.idleTimeoutMs)
        }
      } catch (error) {
        fail(error instanceof Error ? error.message : String(error))
      }
      return
    }
    if (type === 'session.finished') complete()
  })

  socket.onError(() => fail('千问语音连接失败'))
  socket.onClose(() => fail('千问语音连接中断'))
  // The handshake and `session.updated` share one deadline; audio then gets the idle one.
  arm(options.connectTimeoutMs)

  return { close }
}

/** Production socket: Node's global WebSocket, which takes handshake headers. */
function defaultSocket(url: string, init: QwenSocketInit): QwenSocket {
  // The runtime accepts `{ headers }` here (Node 24 / Electron 44). The bundled
  // type for the global constructor only names the protocols parameter, so cast it.
  const create = WebSocket as unknown as new (target: string, options: QwenSocketInit) => WebSocket
  const ws = new create(url, init)
  return {
    send(data) { ws.send(data) },
    close() { ws.close() },
    onOpen(listener) { ws.addEventListener('open', () => listener()) },
    onMessage(listener) {
      ws.addEventListener('message', (event) => {
        const data = (event as MessageEvent).data
        if (typeof data === 'string') listener(data)
      })
    },
    onError(listener) { ws.addEventListener('error', () => listener('network error')) },
    onClose(listener) { ws.addEventListener('close', () => listener()) },
  }
}

function redact(message: string, secret: string): string {
  if (!secret || !message.includes(secret)) return message
  return message.split(secret).join('***')
}
