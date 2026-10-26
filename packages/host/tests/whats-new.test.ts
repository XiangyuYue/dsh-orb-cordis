import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { visibleWhatsNew, WHATS_NEW_VERSION } from '../src/whats-new.ts'

describe('release note visibility', () => {
  it('offers the note only to a supported platform on the exact release', () => {
    assert.deepEqual(visibleWhatsNew(true, WHATS_NEW_VERSION, false), {
      id: WHATS_NEW_VERSION,
      version: WHATS_NEW_VERSION,
    })
    assert.equal(visibleWhatsNew(false, WHATS_NEW_VERSION, false), null, 'Linux has no ball')
    assert.equal(visibleWhatsNew(true, '0.1.9', false), null, 'an older install must not show it')
    assert.equal(visibleWhatsNew(true, '0.2.1', false), null, 'a later version does not inherit the old note')
    assert.equal(visibleWhatsNew(true, '', false), null, 'an unknown layout stays quiet')
  })

  it('stays hidden once the profile closed it', () => {
    assert.equal(visibleWhatsNew(true, WHATS_NEW_VERSION, true), null)
    assert.equal(visibleWhatsNew(false, WHATS_NEW_VERSION, true), null)
  })
})
