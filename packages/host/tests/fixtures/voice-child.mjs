/**
 * Stand-in for the microphone child.
 * Host commands are appended to VOICE_TRACE.
 * Lines appended to VOICE_INJECT are written to stdout, which is how a test
 * emits wake, utterance, and playback without a microphone.
 */
import { appendFileSync, closeSync, openSync, readSync, statSync } from 'node:fs'
import { createInterface } from 'node:readline'

const inject = process.env.VOICE_INJECT ?? ''
const trace = process.env.VOICE_TRACE ?? ''
let offset = 0

function pull() {
  if (!inject) return
  let size = 0
  try {
    size = statSync(inject).size
  } catch {
    return
  }
  if (size < offset) offset = 0
  if (size <= offset) return
  const fd = openSync(inject, 'r')
  const buf = Buffer.alloc(size - offset)
  readSync(fd, buf, 0, buf.length, offset)
  closeSync(fd)
  offset = size
  process.stdout.write(buf)
}

setInterval(pull, 15)
process.stdout.write(`${JSON.stringify({ type: 'mic', open: true, aec: process.env.VOICE_AEC !== '0' })}\n`)

const lines = createInterface({ input: process.stdin })
lines.on('close', () => process.exit(0))
lines.on('line', (line) => {
  if (trace) appendFileSync(trace, `${line}\n`)
  try {
    const message = JSON.parse(line)
    if (message.type === 'speak' && typeof message.id === 'string') {
      process.stdout.write(`${JSON.stringify({ type: 'playback', id: message.id, phase: 'start' })}\n`)
    }
  } catch {
    // Ignore a partial line.
  }
})
