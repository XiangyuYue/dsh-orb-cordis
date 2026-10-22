import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { isRecoverableSpeakerError, speakerErrorMessage } from '../src/speaker.ts'

describe('speaker errors', () => {
  it('treats a streaming buffer underrun as recoverable', () => {
    assert.equal(isRecoverableSpeakerError(new Error('A buffer underrun or overrun occurred.')), true)
    assert.equal(isRecoverableSpeakerError({ message: 'A buffer underrun or overrun occurred.' }), true)
    assert.equal(isRecoverableSpeakerError('A buffer overrun occurred'), true)
  })

  it('keeps a missing device fatal', () => {
    assert.equal(isRecoverableSpeakerError(new Error('The requested device is no longer available')), false)
    assert.equal(isRecoverableSpeakerError({ kind: 'DeviceNotAvailable', message: 'no output' }), false)
    assert.equal(isRecoverableSpeakerError(undefined), false)
  })

  it('reads the message from an Error or a CPAL-shaped object', () => {
    assert.equal(speakerErrorMessage(new Error('boom')), 'boom')
    assert.equal(speakerErrorMessage({ message: 'kaput' }), 'kaput')
    assert.equal(speakerErrorMessage('plain'), 'plain')
  })
})
