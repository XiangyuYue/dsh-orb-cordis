import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { clampTtsVolume, DEFAULT_TTS_VOLUME, scaledSample } from '../src/volume.ts'

describe('speech volume', () => {
  it('rounds to two decimals and clamps to 0–2', () => {
    assert.equal(DEFAULT_TTS_VOLUME, 1)
    assert.equal(clampTtsVolume(0), 0)
    assert.equal(clampTtsVolume(0.456), 0.46)
    assert.equal(clampTtsVolume(1.5), 1.5)
    assert.equal(clampTtsVolume(2.6), 2)
    assert.equal(clampTtsVolume(-1), 0)
    assert.equal(clampTtsVolume(Number.NaN), 1)
    assert.equal(clampTtsVolume(Number.POSITIVE_INFINITY), 1)
  })

  it('scales a sample and clamps a boost to full scale', () => {
    assert.equal(scaledSample(0.5, 1), 0.5)
    assert.equal(scaledSample(0.5, 0.5), 0.25)
    assert.equal(scaledSample(0.5, 0), 0)
    assert.equal(scaledSample(0.8, 2), 1)
    assert.equal(scaledSample(-0.8, 2), -1)
    assert.equal(scaledSample(Number.NaN, 1), 0)
    assert.equal(scaledSample(Number.NaN, 2), 0)
  })
})
