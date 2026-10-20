import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { listenMode, type ListenInput, type ListenMode } from '../src/listen.ts'

const ready: ListenInput = {
  pinned: false,
  agentBusy: false,
  questionOpen: false,
  playbackBusy: false,
  wakeEnabled: true,
  commandEnabled: true,
  micOpen: true,
}

function mode(patch: Partial<ListenInput>): ListenMode {
  return listenMode({ ...ready, ...patch })
}

describe('listen mode', () => {
  it('covers each row of the three listening states', () => {
    assert.equal(mode({ pinned: false }), 'wake', 'unpinned and idle listens for the wake word')
    assert.equal(mode({ pinned: true }), 'command', 'pinned and idle listens for a command')
    assert.equal(mode({ pinned: false, agentBusy: true }), 'off')
    assert.equal(mode({ pinned: true, agentBusy: true }), 'off')
    assert.equal(mode({ pinned: true, questionOpen: true }), 'off')
    assert.equal(mode({ pinned: false, playbackBusy: true }), 'off', 'a closing line still playing closes both ears')
    assert.equal(mode({ pinned: true, playbackBusy: true }), 'off')
  })

  it('drops only the column whose switch is off', () => {
    assert.equal(mode({ pinned: false, wakeEnabled: false }), 'off')
    assert.equal(mode({ pinned: true, wakeEnabled: false }), 'command', 'wake off still allows commands once pinned')
    assert.equal(mode({ pinned: true, commandEnabled: false }), 'off')
    assert.equal(mode({ pinned: false, commandEnabled: false }), 'wake', 'command off still allows the wake word')
    assert.equal(mode({ pinned: false, wakeEnabled: false, commandEnabled: false }), 'off')
    assert.equal(mode({ pinned: true, wakeEnabled: false, commandEnabled: false }), 'off')
  })

  it('keeps listening when TTS is off, because playback never becomes busy', () => {
    assert.equal(mode({ pinned: false, playbackBusy: false }), 'wake')
    assert.equal(mode({ pinned: true, playbackBusy: false }), 'command')
  })

  it('stays off without a microphone, and a busy flag beats a ready column', () => {
    assert.equal(mode({ pinned: false, micOpen: false }), 'off')
    assert.equal(mode({ pinned: true, micOpen: false }), 'off')
    assert.equal(mode({
      pinned: true,
      agentBusy: true,
      questionOpen: true,
      playbackBusy: true,
    }), 'off')
    assert.equal(mode({ pinned: false, questionOpen: true, wakeEnabled: true }), 'off')
  })
})
