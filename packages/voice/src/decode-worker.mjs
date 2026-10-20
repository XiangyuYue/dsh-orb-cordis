/**
 * SenseVoice runs here so the microphone callback never decodes.
 * Main thread posts { id, samples }. This posts { id, text } or { id, error }.
 */
import { createRequire } from 'node:module'
import { parentPort, workerData } from 'node:worker_threads'

const require = createRequire(import.meta.url)
const sherpa = require('sherpa-onnx-node')
const { model, tokens } = workerData

const recognizer = new sherpa.OfflineRecognizer({
  featConfig: { sampleRate: 16000, featureDim: 80 },
  modelConfig: {
    senseVoice: { model, language: 'auto', useInverseTextNormalization: 1 },
    tokens,
    numThreads: 2,
    provider: 'cpu',
    debug: 0,
  },
})

parentPort.postMessage({ ready: true })
parentPort.on('message', ({ id, samples }) => {
  try {
    const stream = recognizer.createStream()
    stream.acceptWaveform({ sampleRate: 16000, samples: new Float32Array(samples) })
    recognizer.decode(stream)
    parentPort.postMessage({ id, text: recognizer.getResult(stream).text.trim() })
  } catch (error) {
    parentPort.postMessage({ id, error: error instanceof Error ? error.message : String(error) })
  }
})
