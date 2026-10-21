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
})
