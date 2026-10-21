import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { holdsDevice, listenMode, needsMicrophone, transcribing, type ListenInput, type ListenMode } from '../src/listen.ts'

const ready: ListenInput = {
  pinned: false,
  agentBusy: false,
  questionOpen: false,
  bodyBusy: false,
  localBusy: false,
  stopping: false,
  wakeEnabled: true,
  commandEnabled: true,
  interjectEnabled: true,
  echoCancel: true,
  micOpen: true,
}

const mic = {
  wakeEnabled: true,
  wakeWords: ['你好大肥鱼'],
  wakeModel: true,
  commandEnabled: true,
  asrModel: true,
  questionOpen: false,
}

function mode(patch: Partial<ListenInput>): ListenMode {
  return listenMode({ ...ready, ...patch })
}

describe('listen mode', () => {
  it('covers the four listening states', () => {
    assert.equal(mode({ pinned: false }), 'wake', 'unpinned and idle listens for the wake word')
    assert.equal(mode({ pinned: true }), 'command', 'pinned and idle listens for a command')
    assert.equal(mode({ pinned: false, agentBusy: true }), 'interject')
    assert.equal(mode({ pinned: true, agentBusy: true }), 'interject', 'a busy agent does not look at the pin')
    assert.equal(mode({ bodyBusy: true }), 'interject', 'a closing line playing or still queued')
    assert.equal(mode({ pinned: true, bodyBusy: true }), 'interject')
    assert.equal(mode({ agentBusy: true, interjectEnabled: false }), 'off', 'an empty interject keyword')
    assert.equal(mode({ agentBusy: true, commandEnabled: false, interjectEnabled: false }), 'off', 'voice input is off')
    assert.equal(mode({ bodyBusy: true, echoCancel: false }), 'off')
    assert.equal(mode({ agentBusy: true, echoCancel: false }), 'interject', 'execution without body audio still listens')
    assert.equal(mode({ agentBusy: true, bodyBusy: true, questionOpen: true, localBusy: true }), 'off')
    assert.equal(holdsDevice({ ...mic, questionOpen: true }), false)
    assert.equal(mode({ localBusy: true }), 'off', 'a wake or dismiss reply is playing')
    assert.equal(mode({ agentBusy: true, stopping: true }), 'off')
    assert.equal(holdsDevice({ ...mic, questionOpen: false }), true, 'stopping does not release the microphone')
    assert.equal(mode({ micOpen: false }), 'off')
    assert.equal(mode({ pinned: true, micOpen: false }), 'off')
  })

  it('treats command and interject as transcription, and the other two as not', () => {
    assert.equal(transcribing('command'), true)
    assert.equal(transcribing('interject'), true)
    assert.equal(transcribing('wake'), false)
    assert.equal(transcribing('off'), false)
  })

  it('drops only the column whose switch is off', () => {
    assert.equal(mode({ pinned: false, wakeEnabled: false }), 'off')
    assert.equal(mode({ pinned: true, wakeEnabled: false }), 'command', 'wake off still allows commands once pinned')
    assert.equal(mode({ pinned: true, commandEnabled: false, interjectEnabled: false }), 'off')
    assert.equal(mode({ pinned: false, commandEnabled: false, interjectEnabled: false }), 'wake', 'command off still allows the wake word')
    assert.equal(mode({ pinned: false, wakeEnabled: false, commandEnabled: false, interjectEnabled: false }), 'off')
    assert.equal(mode({ pinned: true, wakeEnabled: false, commandEnabled: false, interjectEnabled: false }), 'off')
  })

  it('keeps listening when TTS is off, because body audio never becomes busy', () => {
    assert.equal(mode({ pinned: false, bodyBusy: false }), 'wake')
    assert.equal(mode({ pinned: true, bodyBusy: false }), 'command')
  })

  it('holds the microphone only for a listening column that can actually run', () => {
    const base = { wakeEnabled: true, wakeWords: ['你好大肥鱼'], wakeModel: true, commandEnabled: true, asrModel: true }
    assert.equal(needsMicrophone(base), true)
    assert.equal(needsMicrophone({ ...base, wakeEnabled: false }), true, 'voice input still runs')
    assert.equal(needsMicrophone({ ...base, commandEnabled: false }), true, 'wake still runs')
    assert.equal(needsMicrophone({ ...base, wakeEnabled: false, commandEnabled: false }), false)
    assert.equal(needsMicrophone({ ...base, wakeWords: [] }), true, 'command still needs the mic')
    assert.equal(needsMicrophone({ ...base, commandEnabled: false, wakeWords: [] }), false)
    assert.equal(needsMicrophone({ ...base, commandEnabled: false, wakeModel: false }), false)
    assert.equal(needsMicrophone({ ...base, wakeEnabled: false, asrModel: false }), false)
    assert.equal(holdsDevice({ ...base, questionOpen: false }), true)
    assert.equal(holdsDevice({ ...base, questionOpen: true }), false)
    assert.equal(holdsDevice({ ...base, wakeEnabled: false, commandEnabled: false, questionOpen: false }), false)
  })
})
