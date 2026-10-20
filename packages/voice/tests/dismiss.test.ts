import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { isDismiss } from '../src/dismiss.ts'

const phrases = ['你退下吧', '退下吧']

describe('dismiss phrases', () => {
  it('matches a whole factory phrase and ignores trailing punctuation', () => {
    assert.equal(isDismiss('你退下吧。', phrases), true)
    assert.equal(isDismiss('退下吧', phrases), true)
    assert.equal(isDismiss('  退下吧！ ', phrases), true)
    assert.equal(isDismiss('你退下吧。！', phrases), true)
  })

  it('does not match a phrase inside a longer sentence', () => {
    assert.equal(isDismiss('请你退下吧', phrases), false)
    assert.equal(isDismiss('退下吧，去查天气', phrases), false)
    assert.equal(isDismiss('今天天气很好，你退下吧', phrases), false)
  })

  it('matches nothing when the list is empty, and ignores a phrase that is only punctuation', () => {
    assert.equal(isDismiss('你退下吧', []), false)
    assert.equal(isDismiss('。', ['。']), false)
    assert.equal(isDismiss('你退下吧。', ['  你退下吧。 ']), true)
  })
})
