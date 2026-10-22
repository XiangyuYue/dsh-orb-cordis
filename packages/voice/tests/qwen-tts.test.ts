import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  decodeQwenPcm,
  prepareQwenText,
  qwenSessionUpdate,
  speakQwen,
  splitQwenText,
  type QwenSocket,
} from '../src/qwen-tts.ts'

class FakeSocket implements QwenSocket {
  readonly sent: Record<string, any>[] = []
  closed = false
  private openListener: (() => void) | undefined
  private messageListener: ((data: string) => void) | undefined
  private errorListener: ((message: string) => void) | undefined
  private closeListener: (() => void) | undefined

  send(data: string): void {
    this.sent.push(JSON.parse(data) as Record<string, any>)
  }

  close(): void {
    this.closed = true
  }

  onOpen(listener: () => void): void {
    this.openListener = listener
  }

  onMessage(listener: (data: string) => void): void {
    this.messageListener = listener
  }

  onError(listener: (message: string) => void): void {
    this.errorListener = listener
  }

  onClose(listener: () => void): void {
    this.closeListener = listener
  }

  open(): void {
    this.openListener?.()
  }

  message(value: unknown): void {
    this.messageListener?.(typeof value === 'string' ? value : JSON.stringify(value))
  }

  failed(message = 'network error'): void {
    this.errorListener?.(message)
  }

  closedByPeer(): void {
    this.closeListener?.()
  }

  types(): string[] {
    return this.sent.map((item) => String(item.type))
  }
}

function pcm(values: readonly number[]): string {
  const buffer = Buffer.alloc(values.length * 2)
  values.forEach((value, index) => buffer.writeInt16LE(value, index * 2))
  return buffer.toString('base64')
}

function harness(text: string, extra: Partial<Parameters<typeof speakQwen>[0]> = {}) {
  const sockets: FakeSocket[] = []
  const audio: Float32Array[] = []
  let done = 0
  const errors: string[] = []
  const speech = speakQwen({
    text,
    apiKey: 'sk-secret',
    voice: 'Serena',
    speed: 1.5,
    socket: () => {
      const socket = new FakeSocket()
      sockets.push(socket)
      return socket
    },
    onAudio: (samples) => { audio.push(samples) },
    onDone: () => { done += 1 },
    onError: (message) => { errors.push(message) },
    ...extra,
  })
  return { speech, sockets, audio, errors, done: () => done }
}

describe('qwen session protocol', () => {
  it('updates the session first, then sends one text and streams pcm', () => {
    const run = harness('你好。', { voice: 'Serena', speed: 3 })
    const socket = run.sockets[0]
    assert.ok(socket)
    assert.equal(socket.sent.length, 0, 'nothing goes out before the socket opens')

    socket.open()
    assert.deepEqual(socket.types(), ['session.update'])
    assert.deepEqual(socket.sent[0]?.session, {
      mode: 'server_commit',
      voice: 'Serena',
      language_type: 'Chinese',
      response_format: 'pcm',
      sample_rate: 24000,
      speech_rate: 2,
    })
    assert.match(String(socket.sent[0]?.event_id), /^event_[0-9a-f]{32}$/)

    socket.message({ type: 'response.created' })
    assert.deepEqual(socket.types(), ['session.update'], 'audio must wait for session.updated')

    socket.message({ type: 'session.updated' })
    assert.deepEqual(socket.types(), ['session.update', 'input_text_buffer.append', 'session.finish'])
    assert.equal(socket.sent[1]?.text, '你好。')
    assert.notEqual(socket.sent[1]?.event_id, socket.sent[2]?.event_id)

    socket.message({ type: 'response.audio.delta', delta: pcm([0, 16384, -32768]) })
    assert.equal(run.audio.length, 1)
    assert.deepEqual(
      [...(run.audio[0] ?? [])].map((value) => Math.round(value * 32768)),
      [0, 16384, -32768],
    )
    assert.equal(run.done(), 0, 'audio arrives before the sentence is finished')

    socket.message({ type: 'session.finished' })
    assert.equal(run.done(), 1)
    assert.equal(socket.closed, true)
    assert.deepEqual(run.errors, [])
    run.speech.cancel()
    assert.equal(run.done(), 1)
  })

  it('keeps voice case and spaces in the session update', () => {
    assert.deepEqual(qwenSessionUpdate('Eldric Sage', 9), {
      mode: 'server_commit',
      voice: 'Eldric Sage',
      language_type: 'Chinese',
      response_format: 'pcm',
      sample_rate: 24000,
      speech_rate: 2,
    })
  })

  it('closes the socket and stops callbacks when cancelled', () => {
    const run = harness('你好。')
    const socket = run.sockets[0]
    assert.ok(socket)
    socket.open()
    socket.message({ type: 'session.updated' })
    run.speech.cancel()
    assert.equal(socket.closed, true)
    socket.message({ type: 'response.audio.delta', delta: pcm([1, 2, 3]) })
    socket.message({ type: 'session.finished' })
    assert.deepEqual(run.audio, [])
    assert.equal(run.done(), 0)
    assert.deepEqual(run.errors, [])
  })

  it('reports one error and hides the key', () => {
    const run = harness('你好。')
    const socket = run.sockets[0]
    assert.ok(socket)
    socket.open()
    socket.message({ type: 'session.updated' })
    socket.message({ type: 'error', error: { message: 'bad key sk-secret' } })
    assert.equal(run.errors.length, 1)
    assert.equal(run.errors[0]?.includes('sk-secret'), false)
    assert.match(run.errors[0] ?? '', /\*\*\*/)
    assert.equal(run.done(), 0)
    assert.equal(socket.closed, true)
    socket.message({ type: 'session.finished' })
    assert.equal(run.errors.length, 1)
  })

  it('treats a peer close before session.finished as a failure', () => {
    const run = harness('你好。')
    const socket = run.sockets[0]
    assert.ok(socket)
    socket.open()
    socket.message({ type: 'session.updated' })
    socket.closedByPeer()
    assert.equal(run.errors.length, 1)
    assert.equal(run.done(), 0)
  })

  it('times out a connection that never answers', async () => {
    const run = harness('你好。', { connectTimeoutMs: 5 })
    assert.ok(run.sockets[0])
    await new Promise((resolve) => setTimeout(resolve, 30))
    assert.deepEqual(run.errors, ['千问语音合成超时'])
    assert.equal(run.sockets[0]?.closed, true)
    assert.equal(run.done(), 0)
  })

  it('finishes without a request when the text is only markup or blank', async () => {
    const run = harness('   ')
    assert.equal(run.sockets.length, 0)
    await new Promise((resolve) => setTimeout(resolve, 0))
    assert.equal(run.done(), 1)
    assert.deepEqual(run.errors, [])
  })

  it('sends long text as ordered segments over one playback', () => {
    const text = '第一句话。'.repeat(1000)
    const chunks = splitQwenText(prepareQwenText(text))
    assert.ok(chunks.length > 1)
    const run = harness(text)
    assert.equal(run.sockets.length, 1)
    for (let index = 0; index < chunks.length; index += 1) {
      const socket = run.sockets[index]
      assert.ok(socket, `segment ${index} has a socket`)
      socket.open()
      socket.message({ type: 'session.updated' })
      assert.equal(socket.sent[1]?.text, chunks[index])
      socket.message({ type: 'response.audio.delta', delta: pcm([index + 1]) })
      socket.message({ type: 'session.finished' })
      if (index + 1 < chunks.length) assert.equal(run.sockets.length, index + 2)
    }
    assert.equal(run.sockets.length, chunks.length)
    assert.equal(run.done(), 1)
    assert.equal(run.audio.length, chunks.length)
  })
})

describe('qwen text preparation', () => {
  it('drops markdown and keeps English in the same run', () => {
    const cleaned = prepareQwenText('**粗体**\n\n```js\nconst secret = 1\n```\nuseState 很好')
    assert.equal(cleaned.includes('const secret'), false)
    assert.equal(cleaned.includes('省略一段代码'), true)
    assert.equal(cleaned.includes('粗体'), true)
    assert.equal(cleaned.includes('useState'), true)
    assert.equal(cleaned.includes('\n'), false)
    assert.equal(prepareQwenText('  \n\t '), '')
  })

  it('splits at sentence ends, then commas, then a hard boundary', () => {
    assert.deepEqual(splitQwenText('12345678901', 5), ['12345', '67890', '1'])
    const chunks = splitQwenText('第一句。第二句。第三句。', 7)
    assert.deepEqual(chunks, ['第一句。', '第二句。', '第三句。'])
    const long = splitQwenText('一句话。'.repeat(20), 12)
    assert.ok(long.length > 1)
    assert.ok(long.every((chunk) => chunk.length <= 12))
    assert.equal(splitQwenText('', 5).length, 0)
  })

  it('decodes base64 little-endian pcm', () => {
    const decoded = decodeQwenPcm(pcm([-1, 0, 1]))
    assert.equal(decoded.length, 3)
    assert.ok(Math.abs((decoded[0] ?? 0) + 1 / 32768) < 1e-7)
    assert.equal(decoded[1], 0)
    assert.ok(Math.abs((decoded[2] ?? 0) - 1 / 32768) < 1e-7)
  })
})

describe('qwen runtime socket', () => {
  it('constructs the runtime WebSocket with the bearer header and dials Beijing', () => {
    const original = globalThis.WebSocket
    const instances: {
      url: string
      init: unknown
      sent: string[]
      closed: boolean
      listeners: Map<string, ((event: unknown) => void)[]>
    }[] = []
    class FakeRuntimeSocket {
      readonly sent: string[] = []
      readonly listeners = new Map<string, ((event: unknown) => void)[]>()
      closed = false
      readonly url: string
      readonly init: unknown

      constructor(url: string, init: unknown) {
        this.url = url
        this.init = init
        instances.push(this)
      }

      send(data: string): void {
        this.sent.push(data)
      }

      close(): void {
        this.closed = true
      }

      addEventListener(type: string, listener: (event: unknown) => void): void {
        const list = this.listeners.get(type) ?? []
        list.push(listener)
        this.listeners.set(type, list)
      }

      emit(type: string, event: unknown = {}): void {
        for (const listener of this.listeners.get(type) ?? []) listener(event)
      }
    }
    globalThis.WebSocket = FakeRuntimeSocket as unknown as typeof WebSocket
    const errors: string[] = []
    let done = 0
    try {
      speakQwen({
        text: '你好。',
        apiKey: 'sk-secret',
        voice: 'Cherry',
        speed: 1.5,
        onAudio: () => {},
        onDone: () => { done += 1 },
        onError: (message) => { errors.push(message) },
      })
      const socket = instances[0]
      assert.ok(socket)
      assert.equal(socket.url, 'wss://dashscope.aliyuncs.com/api-ws/v1/realtime?model=qwen3-tts-flash-realtime')
      assert.deepEqual(socket.init, { headers: { Authorization: 'Bearer sk-secret' } })
      socket.emit('open')
      assert.equal((JSON.parse(socket.sent[0] ?? '{}') as { type?: string }).type, 'session.update')
      socket.emit('message', { data: JSON.stringify({ type: 'session.updated' }) })
      assert.equal(socket.sent.length, 3)
      socket.emit('message', { data: JSON.stringify({ type: 'error', error: { message: 'bad key' } }) })
      assert.deepEqual(errors, ['bad key'])
      assert.equal(socket.closed, true)
      assert.equal(done, 0)
    } finally {
      globalThis.WebSocket = original
    }
  })
})
