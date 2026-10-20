import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { keywordLines, tokenizeKeyword, type KeywordContext } from '../src/keywords.ts'

const ctx: KeywordContext = {
  tokens: new Set(['n', 'ǐ', 'h', 'ǎo', 'HH', 'AH0']),
  lexicon: new Map([['HI', ['HH', 'AH0']]]),
}

describe('wake keyword tokens', () => {
  it('splits a Chinese phrase into initial and final tokens', () => {
    assert.equal(tokenizeKeyword('你好', ctx), 'n ǐ h ǎo @你好')
  })

  it('looks an English word up in the lexicon and skips a blank line', () => {
    assert.equal(tokenizeKeyword('hi', ctx), 'HH AH0 @hi')
    assert.deepEqual(keywordLines(['你好', '  ', 'hi'], ctx), [
      'n ǐ h ǎo @你好',
      'HH AH0 @hi',
    ])
  })

  it('rejects a phrase the token set cannot pronounce, but keeps the other lines', () => {
    assert.throws(() => tokenizeKeyword('鱼', ctx), /syllable/)
    assert.deepEqual(keywordLines(['鱼', 'hi'], ctx), ['HH AH0 @hi'])
  })
})
