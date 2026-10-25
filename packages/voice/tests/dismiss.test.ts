import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { isDismiss, isInterject } from '../src/dismiss.ts'

const phrases = ['你退下吧', '退下吧']

describe('dismiss phrases', () => {
  it('matches a factory phrase exactly and ignores trailing punctuation', () => {
    assert.equal(isDismiss('你退下吧。', phrases), true)
    assert.equal(isDismiss('退下吧', phrases), true)
    assert.equal(isDismiss('  退下吧！ ', phrases), true)
    assert.equal(isDismiss('你退下吧。！', phrases), true)
  })

  it('matches a phrase contained in a longer sentence', () => {
    assert.equal(isDismiss('好的，你给我退下吧。', phrases), true)
    assert.equal(isDismiss('请你退下吧', phrases), true)
    assert.equal(isDismiss('退下吧，去查天气', phrases), true)
    assert.equal(isDismiss('今天天气很好，你退下吧', phrases), true)
  })

  it('ignores punctuation, spacing, full-width forms, and Latin case', () => {
    assert.equal(isDismiss('好 的 你 给 我 退 下 吧', phrases), true)
    assert.equal(isDismiss('好的，你给我退下吧……', phrases), true)
    assert.equal(isDismiss('OK, Please 退下吧 now.', phrases), true)
    assert.equal(isDismiss('你退下吧', ['  ！退下吧？ ']), true)
  })

  it('does not match a partial phrase or an empty list', () => {
    assert.equal(isDismiss('你退下', phrases), false)
    assert.equal(isDismiss('退下', phrases), false)
    assert.equal(isDismiss('你退下吧', []), false)
    assert.equal(isDismiss('。', ['。']), false)
    assert.equal(isDismiss('你退下吧。', ['  你退下吧。 ']), true)
  })

  it('matches an interject keyword anywhere in the sentence', () => {
    assert.equal(isInterject('大肥鱼，你给我把明天的也查一下', '大肥鱼'), true)
    assert.equal(isInterject('大 肥 鱼。', '大肥鱼'), true)
    assert.equal(isInterject('肥鱼把明天的也查一下', '大肥鱼'), false)
    assert.equal(isInterject('大肥', '大肥鱼'), false)
    assert.equal(isInterject('大肥鱼，再查一次', ''), false)
  })

  it('accepts the ASR homophone of an interject keyword but not a different sound', () => {
    assert.equal(isInterject('大飞鱼，把明天的也查一下', '大肥鱼'), true)
    assert.equal(isInterject('大飞鱼打开抖音。', '大肥鱼'), true)
    assert.equal(isInterject('大肥鱼', '大飞鱼'), true)
    assert.equal(isInterject('大飞机，把明天的也查一下', '大肥鱼'), false)
    assert.equal(isInterject('肥鱼', '大飞鱼'), false)
  })

  it('accepts one wrong leading syllable when the tail of the name is intact', () => {
    assert.equal(isInterject('贾飞鱼你个明天北京天气。', '大肥鱼'), true)
    assert.equal(isInterject('大灰鱼，停一下', '大肥鱼'), true)
    // The last syllable is the anchor: a different word keeps its own meaning.
    assert.equal(isInterject('大飞机，停一下', '大肥鱼'), false)
    // Dismissal stays strict, so an ordinary sentence never ends the turn by accident.
    assert.equal(isDismiss('坐下吧', ['退下吧']), false)
    assert.equal(isDismiss('退着吧', ['退下吧']), false)
  })

  it('accepts a toneless homophone of a two-syllable-or-longer dismiss phrase', () => {
    assert.equal(isDismiss('推下吧', ['退下吧']), true)
    assert.equal(isDismiss('腿下吧', ['退下吧']), true)
    assert.equal(isDismiss('推下', ['退下']), true)
    assert.equal(isDismiss('好的，你退下吧。', ['退下吧']), true)
    assert.equal(isDismiss('坐下吧', ['退下吧']), false)
    assert.equal(isDismiss('飞下吧', ['退下吧']), false)
    assert.equal(isDismiss('走吧', ['走吧']), true, 'short phrases still match exactly')
  })
})
