import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { MAX_AVATAR_RESPONSE_BYTES, readAvatarChoice } from '../src/avatar.ts'
import { MAX_AVATAR_BYTES } from '../../host/src/preferences.ts'

describe('avatar messages', () => {
  it('reads a preset as the relative source the ball page can load', () => {
    assert.deepEqual(readAvatarChoice({ kind: 'preset', src: 'avatars/heart.gif', version: 7 }), {
      kind: 'preset',
      src: 'avatars/heart.gif',
    })
  })

  it('refuses preset sources that leave the page folder or name another scheme', () => {
    for (const src of [
      '../../etc/passwd',
      'avatars/../../orb-avatar',
      '/etc/passwd',
      'file:///etc/passwd',
      'avatars/heart.png',
      'avatars/heart.gif?x=1',
      'Avatars/Heart.gif',
      '',
    ]) {
      assert.deepEqual(readAvatarChoice({ kind: 'preset', src }), { kind: 'default' }, src)
    }
  })

  it('takes the custom avatar from the route and needs a version to refetch on', () => {
    assert.deepEqual(readAvatarChoice({ kind: 'custom', version: 1759250000000 }), {
      kind: 'custom',
      version: 1759250000000,
    })
    assert.deepEqual(readAvatarChoice({ kind: 'custom', version: 0 }), { kind: 'default' })
    assert.deepEqual(readAvatarChoice({ kind: 'custom', version: 'nope' }), { kind: 'default' })
  })

  it('falls back to the shipped GIF for the older message shape', () => {
    assert.deepEqual(readAvatarChoice({ version: 12 }), { kind: 'default' })
    assert.deepEqual(readAvatarChoice({ kind: 'default', version: 12 }), { kind: 'default' })
    assert.deepEqual(readAvatarChoice({}), { kind: 'default' })
  })

  it('reads more of an upload than the host will ever accept', () => {
    // The two caps live in different packages, and the failure when they cross is silent:
    // the host stores an upload the helper then refuses to read, so the ball keeps the old
    // image and nothing says why. This is that invariant.
    assert.ok(
      MAX_AVATAR_RESPONSE_BYTES > MAX_AVATAR_BYTES,
      `helper cap ${MAX_AVATAR_RESPONSE_BYTES} must exceed the host cap ${MAX_AVATAR_BYTES}`,
    )
  })
})
