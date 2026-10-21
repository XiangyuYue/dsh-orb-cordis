import { spawn } from 'node:child_process'
import { appendFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { DEFAULT_VOICE_SETTINGS } from '@dsh-orb/voice/settings'
import { linkProcess, VoiceController, type VoiceLink, type VoicePageMessage } from '../src/voice.ts'

const root = mkdtempSync(join(tmpdir(), 'orb-voice-'))
const script = join(import.meta.dirname, 'fixtures', 'voice-child.mjs')
after(() => { rmSync(root, { recursive: true, force: true }) })

function traceOf(file: string): unknown[] {
  try {
    return readFileSync(file, 'utf8').split('\n').filter(Boolean).map((line) => JSON.parse(line) as unknown)
  } catch {
    return []
  }
}

async function until(check: () => boolean, detail: () => string = () => ''): Promise<void> {
  const start = Date.now()
  while (!check()) {
    if (Date.now() - start > 2000) throw new Error(`timed out waiting for the voice child\n${detail()}`)
    await new Promise((resolve) => setTimeout(resolve, 20))
  }
}

function speaks(file: string): { id: string, text: string }[] {
  return traceOf(file).filter((item) => (item as { type?: string }).type === 'speak') as { id: string, text: string }[]
}

function listenModes(file: string): string[] {
  return traceOf(file).flatMap((item) => {
    const record = item as { type?: string, mode?: string }
    return record.type === 'listen' && record.mode ? [record.mode] : []
  })
}

describe('voice controller with a script child', () => {
  it('walks wake, a command, dismiss, idle, a question, and stop', async () => {
    const dir = join(root, 'run')
    const inject = join(dir, 'inject.ndjson')
    const trace = join(dir, 'trace.ndjson')
    mkdirSync(dir, { recursive: true })
    writeFileSync(inject, '')
    writeFileSync(trace, '')
    const page: VoicePageMessage[] = []
    let now = 0
    const settings = {
      ...DEFAULT_VOICE_SETTINGS,
      wakeWords: [...DEFAULT_VOICE_SETTINGS.wakeWords],
      dismissPhrases: [...DEFAULT_VOICE_SETTINGS.dismissPhrases],
    }
    const child = spawn(process.execPath, [script], {
      env: { ...process.env, VOICE_INJECT: inject, VOICE_TRACE: trace },
      stdio: ['pipe', 'pipe', 'inherit'],
    })
    const voice = new VoiceController({
      settings: () => settings,
      presence: () => ({ wake: true, asr: true, tts: true }),
      now: () => now,
      send: (message) => { page.push(message) },
      open: () => linkProcess(child),
    })
    voice.start()
    try {
    const emit = (message: unknown) => { appendFileSync(inject, `${JSON.stringify(message)}\n`) }
    const speakText = async (text: string) => {
      await until(() => speaks(trace).some((item) => item.text === text), () => readFileSync(trace, 'utf8'))
      const spoken = speaks(trace).findLast((item) => item.text === text)
      assert.ok(spoken)
      return spoken
    }

    await until(() => listenModes(trace).includes('wake'), () => readFileSync(trace, 'utf8'))

    emit({ type: 'wake' })
    const greeting = await speakText('我在')
    assert.equal(greeting.text, '我在')
    assert.equal(page.some((message) => message.type === 'pin'), true)
    emit({ type: 'utterance', text: '这句话不该发送' })
    emit({ type: 'playback', id: greeting.id, phase: 'end' })
    await until(() => listenModes(trace).at(-1) === 'command')
    assert.equal(voice.listenMode(), 'command')
    assert.equal(page.some((message) => message.type === 'voice-prompt'), false)

    emit({ type: 'utterance', text: '查一下今天的天气' })
    await until(() => page.some((message) => message.type === 'voice-prompt' && message.text === '查一下今天的天气'))
    voice.beginTurn()
    assert.equal(voice.listenMode(), 'off')
    voice.endTurn()
    await until(() => voice.listenMode() === 'command')

    emit({ type: 'utterance', text: '好的，你给我退下吧。' })
    await until(() => page.some((message) => message.type === 'unpin'))
    assert.equal(page.filter((message) => message.type === 'voice-prompt').length, 1)
    const goodbye = await speakText('好的，再见')
    assert.equal(goodbye.text, '好的，再见')
    emit({ type: 'playback', id: goodbye.id, phase: 'end' })
    await until(() => voice.listenMode() === 'wake')

    voice.setPinned(true)
    await until(() => voice.listenMode() === 'command')
    const prompts = page.filter((message) => message.type === 'voice-prompt').length
    const unpins = page.filter((message) => message.type === 'unpin').length
    now = 30_000
    voice.poll()
    assert.equal(page.filter((message) => message.type === 'unpin').length, unpins + 1)
    assert.equal(page.filter((message) => message.type === 'voice-prompt').length, prompts)

    voice.setPinned(true)
    voice.beginTurn()
    voice.setPinned(false)
    assert.equal(voice.listenMode(), 'off')
    voice.endTurn()
    assert.equal(voice.listenMode(), 'wake')

    voice.beginTurn()
    voice.questionOpened()
    assert.equal(voice.listenMode(), 'off')
    assert.equal(voice.snapshot().queued.includes('我有几个问题，你来选一下'), true)
    assert.equal(voice.snapshot().hold, true)
    const prompt = await speakText('我有几个问题，你来选一下')
    assert.equal(prompt.text, '我有几个问题，你来选一下')
    voice.questionClosed()
    await until(() => traceOf(trace).some((item) => (item as { type?: string }).type === 'stop-speak'))
    emit({ type: 'playback', id: prompt.id, phase: 'end', stopped: true })
    await until(() => !voice.snapshot().queued.includes('我有几个问题，你来选一下'))

    voice.noteAssistant('block-1', '今天晴。')
    voice.endTurn()
    assert.equal(voice.snapshot().hold, true)
    voice.haltSpeech()
    assert.equal(voice.snapshot().hold, false)
    assert.deepEqual(voice.snapshot().queued, [])
    } finally {
      voice.close()
      child.kill()
    }
  })
})

function settingsWith(patch: Partial<typeof DEFAULT_VOICE_SETTINGS> = {}): typeof DEFAULT_VOICE_SETTINGS {
  return { ...DEFAULT_VOICE_SETTINGS, wakeWords: [...DEFAULT_VOICE_SETTINGS.wakeWords], dismissPhrases: [...DEFAULT_VOICE_SETTINGS.dismissPhrases], ...patch }
}

/** A link that never touches a microphone. `emit` is the child speaking; `die` is a crash. */
function fakeChild() {
  const sent: Record<string, unknown>[] = []
  let message: ((value: unknown) => void) | undefined
  const exits = new Set<() => void>()
  const link: VoiceLink = {
    send(value) { sent.push(value as Record<string, unknown>) },
    close() {},
    onMessage(handler) {
      message = handler
    },
    onExit(handler) { exits.add(handler) },
  }
  return {
    sent,
    link,
    emit(value: unknown) { message?.(value) },
    die() { for (const exit of exits) exit() },
  }
}

describe('voice lifecycle', () => {
  it('opens a new child after the ball was switched off and on', () => {
    const settings = settingsWith()
    const children = [fakeChild(), fakeChild()]
    let opened = 0
    const voice = new VoiceController({
      settings: () => settings,
      presence: () => ({ wake: true, asr: true, tts: true }),
      now: () => 0,
      send() {},
      open: () => children[opened++]?.link,
    })
    voice.start()
    voice.close()
    voice.start()
    assert.equal(opened, 2)
    children[1]?.emit({ type: 'mic', open: true })
    assert.equal(voice.listenMode(), 'wake')
  })

  it('ignores the replaced link exiting after a fresh start', () => {
    const settings = settingsWith()
    const children = [fakeChild(), fakeChild()]
    let opened = 0
    const voice = new VoiceController({
      settings: () => settings,
      presence: () => ({ wake: true, asr: true, tts: true }),
      now: () => 0,
      send() {},
      open: () => children[opened++]?.link,
    })
    voice.start()
    voice.close()
    voice.start()
    children[0]?.die()
    assert.equal(opened, 2)
    children[1]?.emit({ type: 'mic', open: true })
    assert.equal(voice.listenMode(), 'wake')
  })

  it('closes the speech edge when command mode ends, so the idle clock can run again', () => {
    const settings = settingsWith()
    const child = fakeChild()
    const page: VoicePageMessage[] = []
    let now = 0
    const voice = new VoiceController({
      settings: () => settings,
      presence: () => ({ wake: true, asr: true, tts: true }),
      now: () => now,
      send: (message) => { page.push(message) },
      open: () => child.link,
    })
    voice.start()
    child.emit({ type: 'mic', open: true })
    voice.setPinned(true)
    assert.equal(voice.listenMode(), 'command')
    child.emit({ type: 'speech', open: true })
    voice.setPinned(false)
    voice.setPinned(true)
    now = 30_000
    voice.poll()
    assert.equal(page.some((message) => message.type === 'unpin'), true)
  })

  it('forwards the microphone level only while a command is being heard', () => {
    const settings = settingsWith()
    const child = fakeChild()
    const page: VoicePageMessage[] = []
    const voice = new VoiceController({
      settings: () => settings,
      presence: () => ({ wake: true, asr: true, tts: true }),
      now: () => 0,
      send: (message) => { page.push(message) },
      open: () => child.link,
    })
    voice.start()
    child.emit({ type: 'mic', open: true })
    voice.setPinned(true)
    assert.equal(page.some((message) => message.type === 'voice-mode' && message.mode === 'command'), true)
    child.emit({ type: 'level', value: 0.42 })
    assert.equal(page.some((message) => message.type === 'voice-level' && message.value === 0.42), true)
    child.emit({ type: 'level', value: 2 })
    assert.equal(page.some((message) => message.type === 'voice-level' && message.value === 1), true)
    voice.setPinned(false)
    const before = page.length
    child.emit({ type: 'level', value: 0.8 })
    assert.equal(page.slice(before).some((message) => message.type === 'voice-level' && message.value === 0.8), false)
  })

  it('drops the old queue and restarts after a crash, instead of holding the stop button', () => {
    const settings = settingsWith()
    const children = [fakeChild(), fakeChild()]
    let opened = 0
    const voice = new VoiceController({
      settings: () => settings,
      presence: () => ({ wake: true, asr: true, tts: true }),
      now: () => 0,
      send() {},
      open: () => children[opened++]?.link,
    })
    voice.start()
    children[0]?.emit({ type: 'mic', open: true })
    voice.setPinned(true)
    voice.noteAssistant('closing', '今天晴。')
    voice.endTurn()
    assert.equal(voice.snapshot().hold, true)
    children[0]?.die()
    assert.equal(voice.snapshot().hold, false)
    assert.deepEqual(voice.snapshot().queued, [])
    assert.equal(opened, 2)
  })

  it('treats an empty wake list as no wake word', () => {
    const settings = settingsWith({ wakeWords: [] })
    const child = fakeChild()
    const voice = new VoiceController({
      settings: () => settings,
      presence: () => ({ wake: true, asr: true, tts: true }),
      now: () => 0,
      send() {},
      open: () => child.link,
    })
    voice.start()
    child.emit({ type: 'mic', open: true })
    assert.equal(voice.listenMode(), 'off')
  })
})
