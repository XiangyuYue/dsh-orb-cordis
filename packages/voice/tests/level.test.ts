import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { LEVEL_INTERVAL_MS, LevelMeter, normalize } from '../src/level.ts'

function tone(amplitude: number, count = 800): Float32Array {
  const samples = new Float32Array(count)
  for (let i = 0; i < count; i += 1) samples[i] = Math.sin(i / 12) * amplitude
  return samples
}

describe('voice level meter', () => {
  it('reports silence as zero and loud speech near the top', () => {
    assert.equal(normalize(0), 0)
    assert.ok(normalize(0.03) > 0.2)
    assert.ok(normalize(0.3) > 0.85)
    assert.equal(normalize(0.9), 1)
  })

  it('throttles updates and keeps a slow release after a loud block', () => {
    const meter = new LevelMeter()
    const first = meter.push(tone(0.2), 0)
    assert.ok(first !== undefined && first > 0.5)
    assert.equal(meter.push(tone(0.2), LEVEL_INTERVAL_MS - 1), undefined)
    const quiet = meter.push(tone(0), LEVEL_INTERVAL_MS)
    assert.ok(quiet !== undefined)
    assert.ok(quiet > 0, 'release does not drop to zero in one frame')
    assert.ok(quiet < first)
  })

  it('starts a new phrase from silence', () => {
    const meter = new LevelMeter()
    meter.push(tone(0.2), 0)
    meter.reset()
    assert.equal(meter.push(tone(0), 0), 0)
  })
})
