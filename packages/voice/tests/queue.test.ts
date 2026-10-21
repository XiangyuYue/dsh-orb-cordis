import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  createQueue,
  queueView,
  reduceQueue,
  type QueueEffect,
  type QueueEvent,
  type QueueState,
} from '../src/queue.ts'
import { takeReadyPrefix } from '../src/speak-text.ts'

function playText(effects: readonly QueueEffect[]): string[] {
  return effects.filter((effect) => effect.type === 'play').map((effect) => effect.text)
}

function apply(state: QueueState, event: QueueEvent): { state: QueueState, effects: QueueEffect[] } {
  return reduceQueue(state, event)
}

describe('playback queue', () => {
  it('speaks a mid-turn sentence that catches a free speaker, and drops one that does not', () => {
    let state = createQueue(true)
    const caught = apply(state, { type: 'text', text: '我去查一下今天的天气。' })
    assert.deepEqual(playText(caught.effects), ['我去查一下今天的天气。'])
    assert.equal(caught.effects[0]?.type === 'play' && caught.effects[0].kind, 'unclassified')
    state = caught.state
    const later = apply(state, { type: 'text', text: '然后看看明天。' })
    assert.deepEqual(later.effects, [])
    assert.deepEqual(queueView(later.state).held, ['然后看看明天。'])
    const dropped = apply(later.state, { type: 'tool' })
    assert.deepEqual(dropped.effects, [])
    assert.deepEqual(queueView(dropped.state).held, [])
    assert.equal(queueView(dropped.state).playing?.kind, 'mid')
    const playing = queueView(dropped.state).playing
    assert.ok(playing)
    const freed = apply(dropped.state, { type: 'playback-ended', id: playing.id })
    assert.deepEqual(freed.effects, [], 'a sentence parked during the tool call is not spoken later')
    assert.equal(queueView(freed.state).playbackBusy, false)
  })

  it('speaks an unfinished opening line when the tool call starts and the speaker is free', () => {
    let state = createQueue(true)
    const typed = apply(state, { type: 'text', text: '我去查一下今天的天气' })
    assert.deepEqual(typed.effects, [], 'no sentence boundary yet, so nothing plays')
    const started = apply(typed.state, { type: 'tool' })
    assert.deepEqual(playText(started.effects), ['我去查一下今天的天气'])
    assert.equal(started.effects[0]?.type === 'play' && started.effects[0].kind, 'mid')
    assert.equal(started.state.buffer, '')
    state = apply(started.state, { type: 'text', text: '今天晴。' }).state
    const ended = apply(state, { type: 'turn-end' })
    assert.equal(queueView(ended.state).playing?.text, '我去查一下今天的天气')
    assert.deepEqual(queueView(ended.state).queued.map((item) => item.text), ['今天晴。'])
  })

  it('drops an unfinished opening line when the speaker is busy', () => {
    let state = createQueue(true)
    state = apply(state, { type: 'local', text: '我在' }).state
    state = apply(state, { type: 'text', text: '我去查一下今天的天气' }).state
    const dropped = apply(state, { type: 'tool' })
    assert.deepEqual(dropped.effects, [])
    assert.equal(dropped.state.buffer, '')
    assert.equal(queueView(dropped.state).playing?.text, '我在')
    const ended = apply(dropped.state, { type: 'turn-end' })
    assert.deepEqual(queueView(ended.state).queued, [], 'the missed opening line is not saved for the close')
  })

  it('does not speak the unfinished tail once a sentence is already playing', () => {
    let state = createQueue(true)
    state = apply(state, { type: 'text', text: '我去查一下。还没说完' }).state
    assert.equal(queueView(state).playing?.text, '我去查一下。')
    const tool = apply(state, { type: 'tool' })
    assert.deepEqual(tool.effects, [])
    assert.equal(tool.state.buffer, '')
    assert.equal(queueView(tool.state).playing?.kind, 'mid')
    assert.equal(queueView(tool.state).playing?.text, '我去查一下。')
  })

  it('drops a sentence that arrived while the speaker was already busy', () => {
    let state = createQueue(true)
    const occupy = apply(state, { type: 'local', text: '我在' })
    state = occupy.state
    const missed = apply(state, { type: 'text', text: '我去查一下今天的天气。' })
    assert.deepEqual(playText(missed.effects), [])
    const dropped = apply(missed.state, { type: 'tool' })
    const playing = queueView(dropped.state).playing
    assert.equal(playing?.text, '我在')
    assert.deepEqual(queueView(dropped.state).held, [])
    const freed = apply(dropped.state, { type: 'playback-ended', id: playing?.id ?? '' })
    assert.deepEqual(playText(freed.effects), [])
  })

  it('queues a question prompt and a closing line, and stops the prompt when the card closes', () => {
    let state = createQueue(true)
    state = apply(state, { type: 'local', text: '占着喇叭' }).state
    const prompt = apply(state, { type: 'question', text: '我有几个问题，你来选一下' })
    assert.deepEqual(prompt.effects, [])
    assert.deepEqual(queueView(prompt.state).queued.map((item) => item.kind), ['question'])
    state = apply(prompt.state, { type: 'text', text: '今天晴。' }).state
    const closing = apply(state, { type: 'turn-end' })
    assert.deepEqual(queueView(closing.state).queued.map((item) => item.text), [
      '我有几个问题，你来选一下',
      '今天晴。',
    ])
    const local = queueView(closing.state).playing
    assert.ok(local)
    const started = apply(closing.state, { type: 'playback-ended', id: local.id })
    assert.equal(started.effects[0]?.type === 'play' && started.effects[0].kind, 'question')
    const stopped = apply(started.state, { type: 'question-closed' })
    assert.equal(stopped.effects[0]?.type, 'stop')
    assert.equal(queueView(stopped.state).playing?.kind, 'question', 'the stop is confirmed by the playback event')
    const after = apply(stopped.state, { type: 'playback-ended', id: queueView(stopped.state).playing?.id ?? '' })
    assert.equal(after.effects[0]?.type === 'play' && after.effects[0].kind, 'closing')
    assert.equal(after.effects[0]?.type === 'play' && after.effects[0].text, '今天晴。')
  })

  it('leaves body text playing when the card closes before the prompt starts', () => {
    let state = createQueue(true)
    state = apply(state, { type: 'text', text: '我去查一下。' }).state
    state = apply(state, { type: 'question', text: '我有几个问题，你来选一下' }).state
    const closed = apply(state, { type: 'question-closed' })
    assert.deepEqual(closed.effects, [])
    assert.equal(queueView(closed.state).playing?.text, '我去查一下。')
    assert.deepEqual(queueView(closed.state).queued, [])
  })

  it('joins two closing sentences into one slot', () => {
    let state = createQueue(true)
    state = apply(state, { type: 'local', text: '占着喇叭' }).state
    state = apply(state, { type: 'text', text: '今天晴。' }).state
    state = apply(state, { type: 'text', text: '明天也晴。' }).state
    const ended = apply(state, { type: 'turn-end' })
    const view = queueView(ended.state)
    assert.deepEqual(view.queued.map((item) => item.kind), ['closing'])
    assert.equal(view.queued[0]?.text, '今天晴。明天也晴。')
    assert.equal(view.voiceHold, true)
  })

  it('does not queue an unclassified sentence again when the turn ends on it', () => {
    let state = createQueue(true)
    state = apply(state, { type: 'text', text: '今天晴。' }).state
    const ended = apply(state, { type: 'turn-end' })
    assert.deepEqual(ended.effects, [])
    assert.equal(queueView(ended.state).playing?.kind, 'closing')
    assert.equal(queueView(ended.state).playing?.text, '今天晴。')
    assert.deepEqual(queueView(ended.state).queued, [])
  })

  it('keeps a replaced closing behind a prompt that was queued first', () => {
    let state = createQueue(true)
    state = apply(state, { type: 'local', text: '占着喇叭' }).state
    state = apply(state, { type: 'question', text: '我有几个问题，你来选一下' }).state
    state = apply(state, { type: 'text', text: '旧收尾。' }).state
    state = apply(state, { type: 'turn-end' }).state
    state = apply(state, { type: 'text', text: '新收尾。' }).state
    const replaced = apply(state, { type: 'turn-end' })
    assert.deepEqual(queueView(replaced.state).queued.map((item) => item.text), [
      '我有几个问题，你来选一下',
      '新收尾。',
    ])
  })

  it('keeps a replaced closing ahead of a prompt that arrived later', () => {
    let state = createQueue(true)
    state = apply(state, { type: 'local', text: '占着喇叭' }).state
    state = apply(state, { type: 'text', text: '旧收尾。' }).state
    state = apply(state, { type: 'turn-end' }).state
    state = apply(state, { type: 'question', text: '我有几个问题，你来选一下' }).state
    state = apply(state, { type: 'text', text: '新收尾。' }).state
    const replaced = apply(state, { type: 'turn-end' })
    assert.deepEqual(queueView(replaced.state).queued.map((item) => item.text), [
      '新收尾。',
      '我有几个问题，你来选一下',
    ])
  })

  it('clears the holding area, the queue, and the current sound on stop', () => {
    let state = createQueue(true)
    state = apply(state, { type: 'text', text: '正在说。' }).state
    state = apply(state, { type: 'text', text: '还没说。' }).state
    state = apply(state, { type: 'question', text: '我有几个问题，你来选一下' }).state
    const stopped = apply(state, { type: 'stop' })
    assert.equal(stopped.effects[0]?.type, 'stop')
    const view = queueView(stopped.state)
    assert.equal(view.playing, null)
    assert.deepEqual(view.held, [])
    assert.deepEqual(view.queued, [])
    assert.equal(view.playbackBusy, false)
    assert.equal(view.voiceHold, false)
  })

  it('accepts nothing while TTS is off, including prompts and local replies', () => {
    let state = createQueue(false)
    for (const event of [
      { type: 'text', text: '我去查一下今天的天气。' },
      { type: 'question', text: '我有几个问题，你来选一下' },
      { type: 'local', text: '我在' },
      { type: 'turn-end' },
    ] as const) {
      const step = apply(state, event)
      assert.deepEqual(step.effects, [])
      state = step.state
    }
    const view = queueView(state)
    assert.equal(view.playbackBusy, false)
    assert.equal(view.voiceHold, false)
    assert.deepEqual(view.queued, [])
  })

  it('does not let a local reply hold the stop button, and ignores empty phrases', () => {
    const spoken = apply(createQueue(true), { type: 'local', text: '我在' })
    assert.equal(queueView(spoken.state).playbackBusy, true)
    assert.equal(queueView(spoken.state).voiceHold, false)
    const empty = apply(createQueue(true), { type: 'local', text: '   ' })
    assert.deepEqual(empty.effects, [])
    assert.equal(queueView(empty.state).playbackBusy, false)
    const blankPrompt = apply(createQueue(true), { type: 'question', text: '' })
    assert.deepEqual(blankPrompt.effects, [])
    assert.equal(queueView(blankPrompt.state).playbackBusy, false)
  })

  it('does not promote parked text just because the speaker frees', () => {
    let state = createQueue(true)
    state = apply(state, { type: 'text', text: '第一句。' }).state
    state = apply(state, { type: 'text', text: '第二句。' }).state
    const playing = queueView(state).playing
    assert.ok(playing)
    const freed = apply(state, { type: 'playback-ended', id: playing.id })
    assert.deepEqual(freed.effects, [])
    assert.deepEqual(queueView(freed.state).held, ['第二句。'])
  })

  it('speaks one prompt per card', () => {
    let state = createQueue(true)
    state = apply(state, { type: 'question', text: '我有几个问题，你来选一下' }).state
    const again = apply(state, { type: 'question', text: '另一句' })
    assert.deepEqual(again.effects, [])
    assert.equal(queueView(again.state).playing?.text, '我有几个问题，你来选一下')
  })
})

describe('takeReadyPrefix', () => {
  it('keeps numbers and file names intact and still cuts real sentences', () => {
    assert.deepEqual(takeReadyPrefix('版本是 1.13.8 还在写'), { ready: '', rest: '版本是 1.13.8 还在写' })
    assert.deepEqual(takeReadyPrefix('看 voice.mjs 这个文件'), { ready: '', rest: '看 voice.mjs 这个文件' })
    assert.deepEqual(takeReadyPrefix('今天晴。明天'), { ready: '今天晴。', rest: '明天' })
    assert.deepEqual(takeReadyPrefix('Done. Next'), { ready: 'Done.', rest: ' Next' })
    assert.equal(takeReadyPrefix('今天晴。明天', true).ready, '今天晴。明天')
  })
})
