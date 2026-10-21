/**
 * What the speaker may say, and in which order.
 * Mid-turn sentences that miss the speaker are dropped. A closing line and a
 * question prompt each keep one slot and play in the order they first arrived.
 * A later closing replaces the closing text without passing the prompt.
 * An unfinished opening line still in the buffer is spoken when a tool call
 * starts, if the speaker is free. If the speaker is busy, that line is dropped.
 */

import { takeReadyPrefix } from './speak-text.ts'

export type PlayingKind = 'unclassified' | 'mid' | 'closing' | 'question' | 'local'

export type QueueEvent =
  | { type: 'text', text: string }
  | { type: 'tool' }
  | { type: 'turn-end' }
  | { type: 'question', text: string }
  | { type: 'question-closed' }
  | { type: 'local', text: string }
  | { type: 'playback-ended', id: string }
  | { type: 'stop' }
  | { type: 'enabled', enabled: boolean }

export type QueueEffect =
  | { type: 'play', id: string, kind: PlayingKind, text: string }
  | { type: 'stop', id: string }

interface Slot {
  readonly id: string
  readonly text: string
  readonly order: number
}

interface Playing {
  readonly id: string
  readonly kind: PlayingKind
  readonly text: string
}

export interface QueueState {
  readonly enabled: boolean
  readonly buffer: string
  readonly held: readonly string[]
  readonly playing: Playing | null
  readonly closing: Slot | null
  readonly question: Slot | null
  readonly nextId: number
  readonly nextOrder: number
}

export interface QueueView {
  readonly playbackBusy: boolean
  readonly voiceHold: boolean
  readonly playing: Playing | null
  readonly held: readonly string[]
  readonly queued: readonly { id: string, kind: 'closing' | 'question', text: string }[]
}

export function createQueue(enabled: boolean): QueueState {
  return {
    enabled,
    buffer: '',
    held: [],
    playing: null,
    closing: null,
    question: null,
    nextId: 1,
    nextOrder: 1,
  }
}

/** Speaker, closing slot, or question slot. Local replies count; parked mid-turn text does not. */
export function playbackBusy(state: QueueState): boolean {
  return state.playing !== null || state.closing !== null || state.question !== null
}

/** Agent 正文正在播，或收尾还在队列里。途中句、未归类句、收尾都算；提问提示语、本地短句不算。 */
export function bodyBusy(state: QueueState): boolean {
  if (state.closing !== null) return true
  const kind = state.playing?.kind
  return kind === 'unclassified' || kind === 'mid' || kind === 'closing'
}

/** 唤醒回复语或退下回复语正在播。 */
export function localBusy(state: QueueState): boolean {
  return state.playing?.kind === 'local'
}

/**
 * The stop button stays up for a closing line or a question prompt only.
 * A wake reply, a dismiss reply, and a mid-turn sentence do not hold it.
 */
export function voiceHold(state: QueueState): boolean {
  if (state.closing !== null || state.question !== null) return true
  return state.playing?.kind === 'closing' || state.playing?.kind === 'question'
}

export function queueView(state: QueueState): QueueView {
  const queued: { id: string, kind: 'closing' | 'question', text: string }[] = []
  const slots = [
    state.closing === null ? null : { ...state.closing, kind: 'closing' as const },
    state.question === null ? null : { ...state.question, kind: 'question' as const },
  ].filter((slot) => slot !== null)
  slots.sort((left, right) => left.order - right.order)
  for (const slot of slots) queued.push({ id: slot.id, kind: slot.kind, text: slot.text })
  return {
    playbackBusy: playbackBusy(state),
    voiceHold: voiceHold(state),
    playing: state.playing,
    held: state.held,
    queued,
  }
}

export function reduceQueue(state: QueueState, event: QueueEvent): { state: QueueState, effects: QueueEffect[] } {
  switch (event.type) {
    case 'enabled':
      return event.enabled ? { state: { ...state, enabled: true }, effects: [] } : cleared(state, false)
    case 'stop':
      return cleared(state, state.enabled)
    case 'text':
      return state.enabled ? pushText(state, event.text) : { state, effects: [] }
    case 'tool':
      return onTool(state)
    case 'turn-end':
      return onTurnEnd(state)
    case 'question':
      return state.enabled ? onQuestion(state, event.text) : { state, effects: [] }
    case 'question-closed':
      return onQuestionClosed(state)
    case 'local':
      return state.enabled ? onLocal(state, event.text) : { state, effects: [] }
    case 'playback-ended':
      return onPlaybackEnded(state, event.id)
    default:
      return { state, effects: [] }
  }
}

function cleared(state: QueueState, enabled: boolean): { state: QueueState, effects: QueueEffect[] } {
  const effects: QueueEffect[] = state.playing === null ? [] : [{ type: 'stop', id: state.playing.id }]
  return {
    state: {
      ...state,
      enabled,
      buffer: '',
      held: [],
      playing: null,
      closing: null,
      question: null,
    },
    effects,
  }
}

function pushText(state: QueueState, text: string): { state: QueueState, effects: QueueEffect[] } {
  let next: QueueState = { ...state, buffer: state.buffer + text }
  const effects: QueueEffect[] = []
  for (;;) {
    const cut = takeReadyPrefix(next.buffer)
    if (!cut.ready) break
    next = { ...next, buffer: cut.rest }
    const accepted = acceptSentence(next, cut.ready)
    next = accepted.state
    effects.push(...accepted.effects)
  }
  return { state: next, effects }
}

/**
 * A ready sentence plays only when nothing is held back and the speaker and
 * the real queue are both idle. Otherwise it waits in the holding area.
 * The speaker freeing up does not promote that area: a tool call drops it,
 * and the end of the turn folds whatever remains into one closing line.
 */
function acceptSentence(state: QueueState, text: string): { state: QueueState, effects: QueueEffect[] } {
  if (!text.trim()) return { state, effects: [] }
  if (state.playing === null && state.held.length === 0 && !hasQueue(state)) {
    return startPlay(state, 'unclassified', text)
  }
  return { state: { ...state, held: [...state.held, text] }, effects: [] }
}

/**
 * A tool call means the text so far was a mid-turn line, not the closing reply.
 * Parked sentences are dropped. An opening line that has not reached a sentence
 * boundary yet is spoken now when the speaker is free; otherwise it is dropped
 * with the rest, and it is not saved for the closing line.
 */
function onTool(state: QueueState): { state: QueueState, effects: QueueEffect[] } {
  const playing = state.playing?.kind === 'unclassified'
    ? { ...state.playing, kind: 'mid' as const }
    : state.playing
  const pending = state.buffer.trim()
  const cleared: QueueState = { ...state, held: [], buffer: '', playing }
  if (!pending || cleared.playing !== null || hasQueue(cleared)) return { state: cleared, effects: [] }
  return startPlay(cleared, 'mid', pending)
}

function onTurnEnd(state: QueueState): { state: QueueState, effects: QueueEffect[] } {
  if (!state.enabled) return { state: { ...state, buffer: '', held: [] }, effects: [] }
  const tail = takeReadyPrefix(state.buffer, true).ready
  const pieces = [...state.held]
  if (tail.trim()) pieces.push(tail)
  let next: QueueState = {
    ...state,
    buffer: '',
    held: [],
    playing: state.playing?.kind === 'unclassified' ? { ...state.playing, kind: 'closing' } : state.playing,
  }
  const text = pieces.join('').trim()
  if (text) next = enqueueClosing(next, text)
  return drain(next)
}

function onQuestion(state: QueueState, text: string): { state: QueueState, effects: QueueEffect[] } {
  const prompt = text.trim()
  if (!prompt) return { state, effects: [] }
  if (state.question !== null || state.playing?.kind === 'question') return { state, effects: [] }
  const queued = placeQuestion(state, prompt)
  return drain(queued)
}

function onQuestionClosed(state: QueueState): { state: QueueState, effects: QueueEffect[] } {
  const next: QueueState = { ...state, question: null }
  if (next.playing?.kind !== 'question') return drain(next)
  return { state: next, effects: [{ type: 'stop', id: next.playing.id }] }
}

function onLocal(state: QueueState, text: string): { state: QueueState, effects: QueueEffect[] } {
  if (!text.trim()) return { state, effects: [] }
  const effects: QueueEffect[] = []
  let next = state
  if (next.playing !== null) {
    effects.push({ type: 'stop', id: next.playing.id })
    next = { ...next, playing: null }
  }
  const started = startPlay(next, 'local', text.trim())
  return { state: started.state, effects: [...effects, ...started.effects] }
}

function onPlaybackEnded(state: QueueState, id: string): { state: QueueState, effects: QueueEffect[] } {
  if (state.playing?.id !== id) return { state, effects: [] }
  return drain({ ...state, playing: null })
}

function enqueueClosing(state: QueueState, text: string): QueueState {
  if (state.closing !== null) return { ...state, closing: { ...state.closing, text } }
  const id = `v${state.nextId}`
  return {
    ...state,
    nextId: state.nextId + 1,
    nextOrder: state.nextOrder + 1,
    closing: { id, text, order: state.nextOrder },
  }
}

function placeQuestion(state: QueueState, text: string): QueueState {
  const id = `v${state.nextId}`
  return {
    ...state,
    nextId: state.nextId + 1,
    nextOrder: state.nextOrder + 1,
    question: { id, text, order: state.nextOrder },
  }
}

function startPlay(state: QueueState, kind: PlayingKind, text: string): { state: QueueState, effects: QueueEffect[] } {
  const id = `v${state.nextId}`
  const playing: Playing = { id, kind, text }
  return {
    state: { ...state, nextId: state.nextId + 1, playing },
    effects: [{ type: 'play', id, kind, text }],
  }
}

function drain(state: QueueState): { state: QueueState, effects: QueueEffect[] } {
  if (state.playing !== null) return { state, effects: [] }
  const next = earlier(state)
  if (next === null) return { state, effects: [] }
  const slot = next.kind === 'closing' ? state.closing : state.question
  if (slot === null) return { state, effects: [] }
  const playing: Playing = { id: slot.id, kind: next.kind, text: slot.text }
  return {
    state: {
      ...state,
      playing,
      closing: next.kind === 'closing' ? null : state.closing,
      question: next.kind === 'question' ? null : state.question,
    },
    effects: [{ type: 'play', id: slot.id, kind: next.kind, text: slot.text }],
  }
}

function earlier(state: QueueState): { kind: 'closing' | 'question' } | null {
  if (state.closing === null && state.question === null) return null
  if (state.closing === null) return { kind: 'question' }
  if (state.question === null) return { kind: 'closing' }
  return state.closing.order <= state.question.order ? { kind: 'closing' } : { kind: 'question' }
}

function hasQueue(state: QueueState): boolean {
  return state.closing !== null || state.question !== null
}
