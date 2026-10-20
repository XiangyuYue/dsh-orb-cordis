import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { asrPresent, kwsPresent, ttsPresent, voicePresence } from '../src/voice-models.ts'

const root = mkdtempSync(join(tmpdir(), 'orb-voice-models-'))
after(() => { rmSync(root, { recursive: true, force: true }) })

describe('voice model presence', () => {
  it('treats a missing or wrong-sized file as absent', () => {
    assert.equal(asrPresent(join(root, 'missing')), false)
    const asr = join(root, 'asr')
    mkdirSync(join(asr, 'models/sensevoice-onnx'), { recursive: true })
    mkdirSync(join(asr, 'models/silero'), { recursive: true })
    writeFileSync(join(asr, 'models/sensevoice-onnx/model.int8.onnx'), 'x')
    writeFileSync(join(asr, 'models/sensevoice-onnx/tokens.txt'), 'x')
    writeFileSync(join(asr, 'models/silero/silero_vad.onnx'), 'x')
    assert.equal(asrPresent(asr), false)
  })

  it('accepts a wake or TTS directory only when every required file is there', () => {
    const kws = join(root, 'kws')
    mkdirSync(kws, { recursive: true })
    assert.equal(kwsPresent(kws), false)
    for (const name of ['tokens.txt', 'en.phone']) writeFileSync(join(kws, name), 'x')
    for (const chunk of [8, 16]) {
      const tag = `chunk-${chunk}`
      writeFileSync(join(kws, `encoder-epoch-13-avg-2-${tag}-left-64.int8.onnx`), 'x')
      writeFileSync(join(kws, `decoder-epoch-13-avg-2-${tag}-left-64.onnx`), 'x')
      writeFileSync(join(kws, `joiner-epoch-13-avg-2-${tag}-left-64.int8.onnx`), 'x')
    }
    assert.equal(kwsPresent(kws), true)

    const tts = join(root, 'tts')
    const zh = join(tts, 'matcha-icefall-zh-baker')
    const en = join(tts, 'matcha-icefall-en_US-ljspeech')
    mkdirSync(zh, { recursive: true })
    mkdirSync(join(en, 'espeak-ng-data'), { recursive: true })
    for (const name of ['model-steps-3.onnx', 'tokens.txt', 'lexicon.txt', 'date.fst', 'number.fst', 'phone.fst']) {
      writeFileSync(join(zh, name), 'x')
    }
    for (const name of ['model-steps-3.onnx', 'tokens.txt']) writeFileSync(join(en, name), 'x')
    writeFileSync(join(tts, 'vocos-22khz-univ.onnx'), 'x')
    assert.equal(ttsPresent(tts), true)
    assert.deepEqual(voicePresence({ kws, asr: join(root, 'missing'), tts }), {
      wake: true,
      asr: false,
      tts: true,
    })
  })
})
