import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { planSpeeds, prepare, renderSpeech, sola } from '../src/speak-text.ts'

describe('speech rendering', () => {
  it('keeps the Chinese model at 1.5 and spends the rest on time stretch', () => {
    const comfortable = planSpeeds(1.5)
    assert.equal(comfortable.modelZh, 1.5)
    assert.ok(comfortable.solaRatio < 1.1)
    const fast = planSpeeds(3)
    assert.equal(fast.modelZh, 1.5)
    assert.ok(fast.solaRatio > 2)
    assert.ok(fast.modelEn <= 3)
  })

  it('turns a code block into one short phrase and does not read the source', () => {
    const pieces = prepare('看这里 ```js\nconst secret = 1\n``` 就好。')
    const text = pieces.map((piece) => piece.text).join('')
    assert.match(text, /省略一段代码/)
    assert.equal(text.includes('secret'), false)
  })

  it('asks the Chinese model for at most 1.5 and stitches sentences into one buffer', () => {
    const speeds: number[] = []
    const rendered = renderSpeech('今天晴。明天也晴。', 3, (_sentence, lang, modelSpeed) => {
      if (lang === 'zh') speeds.push(modelSpeed)
      const samples = new Float32Array(22050)
      for (let i = 0; i < samples.length; i += 1) samples[i] = 0.2
      return { samples, sampleRate: 22050 }
    })
    assert.ok(speeds.every((speed) => speed <= 1.5))
    assert.equal(speeds.length, 2)
    assert.ok(rendered.samples.length > 15_000, 'both sentences survive the stretch')
    assert.ok(rendered.samples.length < 44_000, '3x is shorter than the two raw sentences')
  })

  it('shortens audio when the stretch ratio is above 1', () => {
    const source = new Float32Array(22050)
    for (let i = 0; i < source.length; i += 1) source[i] = Math.sin(i / 20) * 0.2
    const faster = sola(source, 22050, 2)
    assert.ok(faster.length < source.length)
    assert.ok(faster.length > source.length / 3)
  })
})
