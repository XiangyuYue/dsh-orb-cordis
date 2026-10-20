import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

const tts = join(homedir(), '.dsh', 'dsh-orb', 'voice', 'tts')
const ready = existsSync(join(tts, 'matcha-icefall-zh-baker', 'model-steps-3.onnx'))
const childPath = join(import.meta.dirname, '../src/child.ts')

describe('voice child playback', () => {
  it('ends a segment that is stopped before the speaker starts', { skip: !ready }, async () => {
    const child = spawn(process.execPath, [
      '--experimental-transform-types',
      '--disable-warning=ExperimentalWarning',
      childPath,
    ], { stdio: ['pipe', 'pipe', 'pipe'] })
    const lines: string[] = []
    const waiting: ((line: string) => void)[] = []
    let buffer = ''
    child.stdout.setEncoding('utf8')
    child.stdout.on('data', (chunk: string) => {
      buffer += chunk
      let cut = buffer.indexOf('\n')
      while (cut >= 0) {
        const line = buffer.slice(0, cut)
        buffer = buffer.slice(cut + 1)
        const next = waiting.shift()
        if (next) next(line)
        else lines.push(line)
        cut = buffer.indexOf('\n')
      }
    })
    const waitLine = () => {
      const existing = lines.shift()
      if (existing !== undefined) return Promise.resolve(existing)
      return new Promise<string>((resolve) => { waiting.push(resolve) })
    }
    const send = (message: unknown) => { child.stdin.write(`${JSON.stringify(message)}\n`) }
    try {
      send({
        type: 'configure',
        settings: { ttsEnabled: true, ttsSpeed: 1.5, wakeEnabled: false, commandEnabled: false },
        paths: { tts },
      })
      const mic = JSON.parse(await waitLine()) as { type?: string, open?: boolean }
      assert.equal(mic.type, 'mic')
      assert.equal(mic.open, true)
      send({ type: 'speak', id: 'cut', text: '我去查一下今天的天气，然后告诉你要不要带伞，再看看明天适不适合出门。' })
      const started = Date.now()
      send({ type: 'stop-speak' })
      const end = JSON.parse(await waitLine()) as { type?: string, id?: string, phase?: string, stopped?: boolean }
      const elapsed = Date.now() - started
      assert.equal(end.type, 'playback')
      assert.equal(end.id, 'cut')
      assert.equal(end.phase, 'end')
      assert.equal(end.stopped, true)
      assert.ok(elapsed < 1000, `stop waited ${elapsed}ms for synthesis`)
    } finally {
      child.kill()
    }
  })
})
