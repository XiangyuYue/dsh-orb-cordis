import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  clampQwenSpeed,
  DEFAULT_QWEN_SPEED,
  DEFAULT_QWEN_VOICE,
  isQwenVoice,
  QWEN_SPEED_MAX,
  QWEN_SPEED_MIN,
  QWEN_VOICES,
  qwenVoiceViews,
} from '../src/qwen.ts'
import { DEFAULT_VOICE_SETTINGS, parseVoiceSettings, ttsReady } from '../src/settings.ts'

describe('qwen voice catalogue', () => {
  it('carries all 48 system voices in their two groups', () => {
    assert.equal(QWEN_VOICES.length, 48)
    assert.equal(QWEN_VOICES.filter((item) => item.group === 'standard').length, 38)
    assert.equal(QWEN_VOICES.filter((item) => item.group === 'dialect').length, 10)
    assert.equal(new Set(QWEN_VOICES.map((item) => item.voice)).size, 48)
    assert.equal(DEFAULT_QWEN_VOICE, 'Cherry')
  })

  it('keeps the voice strings exactly as the service spells them', () => {
    for (const voice of ['Eldric Sage', 'Ono Anna', 'Radio Gol']) {
      assert.equal(QWEN_VOICES.some((item) => item.voice === voice), true, voice)
      assert.equal(isQwenVoice(voice), true)
    }
    assert.equal(isQwenVoice('eldric sage'), false, 'the wire value is case-sensitive')
    assert.equal(isQwenVoice('EldricSage'), false, 'the space is part of the name')
    assert.equal(isQwenVoice('unknown'), false)
    assert.equal(isQwenVoice(undefined), false)
  })

  it('formats each choice as name, gender, and one trait', () => {
    const views = qwenVoiceViews()
    const voiceView = (voice: string) => views.find((item) => item.voice === voice)
    assert.equal(voiceView('Cherry')?.label, '芊悦 · 女 · 阳光亲切')
    assert.equal(voiceView('Eldric Sage')?.label, '沧明子 · 男 · 沉稳老者')
    assert.equal(voiceView('Jada')?.label, '上海-阿珍 · 女 · 上海话')
    assert.equal(voiceView('Jada')?.group, 'dialect')
    assert.equal(voiceView('Cherry')?.group, 'standard')
  })

  it('clamps the speed to 0.5–2.0 at one decimal', () => {
    assert.equal(QWEN_SPEED_MIN, 0.5)
    assert.equal(QWEN_SPEED_MAX, 2)
    assert.equal(clampQwenSpeed(0.1), 0.5)
    assert.equal(clampQwenSpeed(0.54), 0.5)
    assert.equal(clampQwenSpeed(1.54), 1.5)
    assert.equal(clampQwenSpeed(2.4), 2)
    assert.equal(clampQwenSpeed(Number.NaN), DEFAULT_QWEN_SPEED)
    assert.equal(clampQwenSpeed(Number.POSITIVE_INFINITY), DEFAULT_QWEN_SPEED)
  })
})

describe('qwen voice settings', () => {
  it('uses the factory selection for an absent or bad file', () => {
    const parsed = parseVoiceSettings(undefined)
    assert.equal(parsed.ttsBackend, 'local')
    assert.equal(parsed.qwenApiKey, '')
    assert.equal(parsed.qwenVoice, 'Cherry')
    assert.equal(parsed.qwenSpeed, 1.5)
    assert.equal(parsed.ttsSpeed, 1.5)
    assert.deepEqual(parsed, DEFAULT_VOICE_SETTINGS)
  })

  it('keeps a valid qwen selection and pulls bad fields into range', () => {
    const parsed = parseVoiceSettings({
      ttsBackend: 'qwen',
      qwenApiKey: '  sk-test-key \n',
      qwenVoice: 'Eldric Sage',
      qwenSpeed: 2.44,
      ttsSpeed: 2.3,
    })
    assert.equal(parsed.ttsBackend, 'qwen')
    assert.equal(parsed.qwenApiKey, 'sk-test-key')
    assert.equal(parsed.qwenVoice, 'Eldric Sage')
    assert.equal(parsed.qwenSpeed, 2)
    assert.equal(parsed.ttsSpeed, 2.3, 'the local speed is stored separately')

    const local = parseVoiceSettings({ ttsBackend: 'local', qwenSpeed: 0.1, ttsSpeed: 3 })
    assert.equal(local.ttsBackend, 'local')
    assert.equal(local.qwenSpeed, 0.5)
    assert.equal(local.ttsSpeed, 3)
  })

  it('treats a blank or missing key as not filled', () => {
    assert.equal(parseVoiceSettings({ qwenApiKey: '   ' }).qwenApiKey, '')
    assert.equal(parseVoiceSettings({ qwenApiKey: '\t\r\n' }).qwenApiKey, '')
    assert.equal(parseVoiceSettings({ qwenApiKey: 42 }).qwenApiKey, '')
    assert.equal(parseVoiceSettings({ qwenApiKey: 'a'.repeat(400) }).qwenApiKey.length, 300)
  })

  it('falls back to Cherry for an unknown or differently cased voice', () => {
    assert.equal(parseVoiceSettings({ qwenVoice: 'nope' }).qwenVoice, 'Cherry')
    assert.equal(parseVoiceSettings({ qwenVoice: 'eLDric sage' }).qwenVoice, 'Cherry')
    assert.equal(parseVoiceSettings({ qwenVoice: ' Eldric Sage ' }).qwenVoice, 'Eldric Sage')
    assert.equal(parseVoiceSettings({ qwenVoice: 7 }).qwenVoice, 'Cherry')
  })

  it('reads backend readiness as the switch plus that backend only', () => {
    const local = { ...DEFAULT_VOICE_SETTINGS, ttsBackend: 'local' as const }
    assert.equal(ttsReady(local, true), true)
    assert.equal(ttsReady(local, false), false)
    const qwen = { ...DEFAULT_VOICE_SETTINGS, ttsBackend: 'qwen' as const, qwenApiKey: 'sk-test' }
    assert.equal(ttsReady(qwen, false), true, 'qwen does not need the local files')
    assert.equal(ttsReady(qwen, true), true)
    assert.equal(ttsReady({ ...qwen, qwenApiKey: '   ' }, true), false)
    assert.equal(ttsReady({ ...qwen, ttsEnabled: false }, true), false)
  })
})
