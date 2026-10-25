import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { isEcho, type SpokenLine } from '../src/echo.ts'

const commands = ['大肥鱼', '你退下吧', '退下吧']

function line(text: string, startedAt: number, endedAt?: number): SpokenLine {
  return { text, startedAt, endedAt }
}

describe('text echo filter', () => {
  it('drops a transcript that is the line being spoken', () => {
    const spoken = [line('我去查一下今天的天气', 0)]
    assert.equal(isEcho('我去查一下今天天气', spoken, { from: 100, to: 800 }, commands), true)
  })

  it('keeps an interjection spoken over the same line', () => {
    const spoken = [line('我去查一下今天的天气', 0)]
    assert.equal(isEcho('大肥鱼，把明天的也查一下', spoken, { from: 100, to: 800 }, commands), false)
  })

  it('keeps a mixed sentence that brings a command the playback does not contain', () => {
    const spoken = [line('我去查一下今天的天气', 0)]
    assert.equal(isEcho('我去查一下今天的天气大肥鱼停一下', spoken, { from: 100, to: 900 }, commands), false)
  })

  it('drops a playback line that itself contains the keyword', () => {
    const spoken = [line('大肥鱼会帮你查', 0)]
    assert.equal(isEcho('大肥鱼会帮你查', spoken, { from: 100, to: 800 }, commands), true)
  })

  it('keeps the same words once the playback has been over for two seconds', () => {
    const spoken = [line('我去查一下今天的天气', 0, 1000)]
    assert.equal(isEcho('我去查一下今天的天气', spoken, { from: 3000, to: 3600 }, commands), false)
  })

  it('judges each queued recognition by its own window', () => {
    const spoken = [line('我去查一下今天的天气', 0, 1000)]
    assert.equal(isEcho('我去查一下今天的天气', spoken, { from: 100, to: 900 }, commands), true)
    assert.equal(isEcho('我去查一下今天的天气', spoken, { from: 4000, to: 4600 }, commands), false)
  })

  it('treats a homophone of the playback as echo', () => {
    const spoken = [line('我去查一下今天的天气', 0)]
    assert.equal(isEcho('我去差一下今天的天气', spoken, { from: 100, to: 800 }, commands), true)
  })

  it('does not treat a one-syllable transcript as echo', () => {
    const spoken = [line('好的，再见', 0)]
    assert.equal(isEcho('好', spoken, { from: 100, to: 400 }, commands), false)
  })

  it('keeps a short interjection while a long paragraph is playing', () => {
    // The assistant's long answer is one playback line; the user's phrase is a
    // second of it. Comparing against the whole paragraph would call it echo.
    const paragraph = `${'好的，我帮你把明天的天气查一下，'.repeat(40)}大肥鱼会帮你查`
    const spoken = [line(paragraph, 0)]
    assert.equal(isEcho('大肥鱼别说了', spoken, { from: 100, to: 800 }, commands), false)
  })
})
