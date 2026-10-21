/**
 * Host-side voice controller.
 * The page owns the pin gesture. This decides whether the microphone feeds the
 * wake word or a command, and which sentence the speaker may play.
 * The child process only captures, recognizes, synthesizes, and plays.
 */

import { fork, type ChildProcess } from 'node:child_process'
import { existsSync } from 'node:fs'
import { createInterface } from 'node:readline'
import { fileURLToPath } from 'node:url'
import { isDismiss, normalizeUtterance } from '@dsh-orb/voice/dismiss'
import { createIdle, stepIdle, type IdleClock } from '@dsh-orb/voice/idle'
import { listenMode, needsMicrophone, type ListenMode } from '@dsh-orb/voice/listen'
import {
  bodyBusy,
  createQueue,
  localBusy,
  queueView,
  reduceQueue,
  voiceHold,
  type QueueEffect,
  type QueueEvent,
  type QueueState,
} from '@dsh-orb/voice/queue'
import { hasWakeWord, type VoiceSettings } from '@dsh-orb/voice/settings'

export interface VoicePresence {
  readonly wake: boolean
  readonly asr: boolean
  readonly tts: boolean
}

export interface VoicePageMessage {
  readonly type: 'pin' | 'unpin' | 'voice-hold' | 'voice-prompt' | 'voice-mode' | 'voice-level'
  readonly hold?: boolean
  readonly text?: string
  readonly mode?: ListenMode
  readonly value?: number
}

export interface VoiceLink {
  send(message: unknown): void
  close(): void
  onMessage(handler: (message: unknown) => void): void
  onExit(handler: () => void): void
}

export interface VoiceControllerOptions {
  settings(): VoiceSettings
  /** Model files on disk. A missing model turns that column off without changing the switch. */
  presence(): VoicePresence
  now(): number
  /** Model directories. Absent until the host knows where DeepSeek Harness keeps them. */
  paths?(): { kws: string, asrModel: string, asrTokens: string, asrVad: string, tts: string }
  send(message: VoicePageMessage): void
  /** Fork the voice child. Undefined means this host has no voice runtime. */
  open(): VoiceLink | undefined
}

const RESTART_LIMIT = 3

export class VoiceController {
  private queue: QueueState = createQueue(false)
  private idle: IdleClock = createIdle()
  private link: VoiceLink | undefined
  private timer: ReturnType<typeof setInterval> | undefined
  private live = false
  private closing = false
  private restarts = 0
  private failed = false
  private pinned = false
  private agentBusy = false
  private questionOpen = false
  private speechOpen = false
  private micOpen = false
  private micKnown = false
  private mode: ListenMode = 'off'
  /**
   * Audio from just before a command starts, kept so the first syllable survives the switch.
   * Factory 300; one wake with a spoken reply uses zero so that reply is not echoed.
   */
  private commandSeed = 300
  private hold = false
  private seen = new Map<string, string>()

  constructor(private readonly options: VoiceControllerOptions) {
    this.queue = createQueue(this.ttsOn())
  }

  /**
   * Start the child. A second call while it is up does nothing.
   *
   * `initial` is the state of the ball when this lifecycle starts. The helper is freshly
   * launched and its page starts unpinned, so the pin is always false here; a turn or a
   * question can already exist when the ball is switched back on.
   */
  start(initial: { agentBusy?: boolean, questionOpen?: boolean } = {}): void {
    if (this.live) return
    this.fresh(initial)
    this.launchChild()
  }

  /**
   * Stop the child for this lifecycle. A later {@link start} is a new lifecycle: it must
   * not inherit `closing` or a spent restart budget, or switching the ball off and on
   * would leave voice dead until the whole app restarts.
   */
  close(): void {
    this.closing = true
    this.live = false
    if (this.timer) clearInterval(this.timer)
    this.timer = undefined
    this.link?.close()
    this.link = undefined
    this.resetPlayback()
    this.micOpen = false
    this.micKnown = false
    this.mode = 'off'
    this.hold = false
    this.options.send({ type: 'voice-hold', hold: false })
    this.options.send({ type: 'voice-mode', mode: 'off' })
    this.options.send({ type: 'voice-level', value: 0 })
  }

  /**
   * Null until the child reports, or while no listening column needs the device.
   * False means a column is enabled but the microphone could not be opened.
   */
  microphone(): boolean | null {
    if (!this.listeningEnabled()) return null
    if (!this.live || !this.micKnown) return null
    return this.micOpen
  }

  /** Whether wake or voice input can actually run; TTS does not use the microphone. */
  private listeningEnabled(): boolean {
    const settings = this.options.settings()
    const presence = this.options.presence()
    return needsMicrophone({
      wakeEnabled: settings.wakeEnabled,
      wakeWords: settings.wakeWords,
      wakeModel: presence.wake,
      commandEnabled: settings.commandEnabled,
      asrModel: presence.asr,
    })
  }

  /** Whether the page should keep the panel up and the stop button for a closing line or prompt. */
  holdState(): boolean {
    return this.hold
  }

  /** The settings file changed. Switches take effect without reloading a model. */
  applySettings(): void {
    if (!this.live) return
    const enabled = this.ttsOn()
    if (enabled !== this.queue.enabled) this.apply({ type: 'enabled', enabled })
    this.pushConfigure()
    this.pushListen(true)
    this.poll()
  }

  /** The page owns the gesture; keep the state even while the child is restarting. */
  setPinned(pinned: boolean): void {
    if (this.pinned === pinned) return
    this.pinned = pinned
    if (!pinned) this.idle = createIdle()
    this.pushListen(false)
    this.poll()
  }

  /** A keystroke, or a text command that was just sent. */
  activity(): void {
    if (!this.live) return
    const step = stepIdle(this.idle, { ...this.sample(), activity: true })
    this.idle = step.clock
  }

  beginTurn(): void {
    this.agentBusy = true
    this.pushListen(false)
    this.poll()
  }

  /** The turn's assistant text is already in the queue. Fold the tail into a closing line. */
  endTurn(): void {
    this.agentBusy = false
    // With no live child there is no speaker to drain; queueing here would leave a
    // `playing` item that never ends after the restart.
    if (!this.live) {
      this.pushListen(false)
      return
    }
    this.apply({ type: 'turn-end' })
    this.poll()
  }

  /** Full assistant text for one block. Only the newly arrived suffix is spoken. */
  noteAssistant(key: string, text: string): void {
    const previous = this.seen.get(key) ?? ''
    if (!text.startsWith(previous)) return
    // Track text even while the child is restarting; otherwise the first update after the
    // restart would feed the whole block to the speaker again.
    this.seen.set(key, text)
    const delta = text.slice(previous.length)
    if (delta && this.live) this.apply({ type: 'text', text: delta })
  }

  tool(): void {
    if (!this.live) return
    this.apply({ type: 'tool' })
  }

  questionOpened(): void {
    this.questionOpen = true
    // Without a live child the card still closes the ears once the child is back; there is
    // no speaker to queue the prompt for yet.
    if (!this.live) {
      this.pushListen(false)
      return
    }
    this.apply({ type: 'question', text: this.options.settings().questionPrompt })
    this.poll()
  }

  questionClosed(): void {
    if (!this.questionOpen) return
    this.questionOpen = false
    if (!this.live) {
      this.pushListen(false)
      return
    }
    this.apply({ type: 'question-closed' })
    this.poll()
  }

  /** Stop button: drop speech. The caller stops the agent turn separately when one is running. */
  haltSpeech(): void {
    if (!this.live) return
    this.apply({ type: 'stop' })
    this.poll()
  }

  /** The panel moved to another conversation. */
  clearSession(): void {
    this.seen.clear()
    this.questionOpen = false
    this.agentBusy = false
    if (!this.live) {
      this.pushListen(false)
      return
    }
    this.apply({ type: 'stop' })
    this.poll()
  }

  /** Advance the idle clock. Tests call this instead of waiting. */
  poll(): void {
    if (!this.live) return
    const step = stepIdle(this.idle, this.sample())
    this.idle = step.clock
    if (step.unpin) this.requestUnpin()
  }

  /** What the child was last told to listen for. Tests read this. */
  listenMode(): ListenMode {
    return this.mode
  }

  snapshot(): { hold: boolean, pinned: boolean, mode: ListenMode, queued: readonly string[] } {
    const view = queueView(this.queue)
    return {
      hold: this.hold,
      pinned: this.pinned,
      mode: this.mode,
      queued: [
        ...view.playing ? [view.playing.text] : [],
        ...view.queued.map((item) => item.text),
      ],
    }
  }

  private onChild(message: unknown): void {
    const record = asRecord(message)
    const type = record?.type
    if (type === 'mic') {
      this.micKnown = true
      this.micOpen = record?.open === true
      this.pushListen(false)
      return
    }
    if (type === 'wake') {
      this.onWake()
      return
    }
    if (type === 'speech') {
      // A late `speech: true` from a command mode that has already ended must not pause
      // the idle clock forever.
      this.speechOpen = record?.open === true && this.mode === 'command'
      this.poll()
      return
    }
    if (type === 'level' && typeof record?.value === 'number') {
      // The child measures the same microphone the page is waiting on. Forward it only
      // while a command is actually being heard; never during wake or playback.
      if (this.mode === 'command') {
        const value = Math.max(0, Math.min(1, record.value))
        this.options.send({ type: 'voice-level', value })
      }
      return
    }
    if (type === 'utterance' && typeof record?.text === 'string') {
      this.onUtterance(record.text)
      return
    }
    if (type === 'playback' && typeof record?.id === 'string' && record.phase === 'end') {
      this.apply({ type: 'playback-ended', id: record.id })
      this.poll()
    }
  }

  private onWake(): void {
    if (this.mode !== 'wake') return
    this.pinned = true
    this.options.send({ type: 'pin' })
    const reply = this.localReply(this.options.settings().wakeReply)
    // The reply is about to play in the same room; do not hand its tail to the recognizer.
    this.commandSeed = reply ? 0 : 300
    if (reply) this.apply({ type: 'local', text: reply })
    else this.pushListen(false)
    this.poll()
  }

  private onUtterance(text: string): void {
    if (this.mode !== 'command') return
    this.speechOpen = false
    const settings = this.options.settings()
    const spoken = stripWakePrefix(text, settings.wakeWords)
    if (!spoken) {
      this.poll()
      return
    }
    if (settings.commandEnabled && isDismiss(spoken, settings.dismissPhrases)) {
      this.requestUnpin()
      const reply = this.localReply(settings.dismissReply)
      if (reply) this.apply({ type: 'local', text: reply })
      this.poll()
      return
    }
    this.options.send({ type: 'voice-prompt', text: spoken })
    this.activity()
    this.poll()
  }

  private onChildExit(link?: VoiceLink): void {
    // A replaced lifecycle closed this link; its late exit must not take the new one down.
    if (link !== undefined && link !== this.link) return
    this.link = undefined
    this.live = false
    this.micOpen = false
    this.micKnown = false
    this.speechOpen = false
    if (this.timer) clearInterval(this.timer)
    this.timer = undefined
    if (this.closing) return
    // The dead child will not send the playback end this queue is waiting for.
    // Clearing it here keeps the microphone from staying shut after a crash.
    this.resetPlayback()
    this.idle = createIdle()
    this.commandSeed = 300
    this.options.send({ type: 'voice-mode', mode: 'off' })
    this.restartChild()
  }

  /** A new lifecycle starts with no inherited queue, pin, speech edge, or restart budget. */
  private fresh(initial: { agentBusy?: boolean, questionOpen?: boolean }): void {
    this.closing = false
    this.restarts = 0
    this.failed = false
    this.pinned = false
    this.agentBusy = initial.agentBusy === true
    this.questionOpen = initial.questionOpen === true
    this.speechOpen = false
    this.micOpen = false
    this.micKnown = false
    this.mode = 'off'
    this.commandSeed = 300
    this.hold = false
    this.idle = createIdle()
    // `seen` follows the displayed conversation, not the child lifecycle. Clearing it here
    // would make the first block update after a ball toggle replay a whole assistant answer.
    this.queue = createQueue(this.ttsOn())
    this.options.send({ type: 'voice-hold', hold: false })
    this.options.send({ type: 'voice-mode', mode: 'off' })
    this.options.send({ type: 'voice-level', value: 0 })
  }

  private launchChild(): void {
    if (this.live) return
    let link: VoiceLink | undefined
    try {
      link = this.options.open()
    } catch {
      link = undefined
    }
    if (link === undefined) {
      this.failed = true
      this.mode = 'off'
      return
    }
    this.live = true
    this.link = link
    // A settings edit during a crash/restart may have changed whether speech is allowed.
    const enabled = this.ttsOn()
    if (enabled !== this.queue.enabled) this.queue = createQueue(enabled)
    // Messages and exits from a link that a later lifecycle replaced must be ignored.
    link.onMessage((message) => { if (this.link === link) this.onChild(message) })
    this.timer = setInterval(() => this.poll(), 250)
    this.timer.unref()
    link.onExit(() => this.onChildExit(link))
    this.pushConfigure()
    this.pushListen(true)
  }

  /** A crashed child gets a fresh process, up to the documented limit. */
  private restartChild(): void {
    if (this.closing) return
    this.restarts += 1
    if (this.restarts > RESTART_LIMIT) {
      this.failed = true
      this.mode = 'off'
      return
    }
    this.launchChild()
  }

  private resetPlayback(): void {
    this.queue = createQueue(this.ttsOn())
    if (this.hold) {
      this.hold = false
      this.options.send({ type: 'voice-hold', hold: false })
    }
  }

  private requestUnpin(): void {
    if (!this.pinned) return
    this.pinned = false
    this.idle = createIdle()
    this.options.send({ type: 'unpin' })
    this.pushListen(false)
  }

  private apply(event: QueueEvent): void {
    const step = reduceQueue(this.queue, event)
    this.queue = step.state
    this.dispatch(step.effects)
    this.syncHold()
    this.pushListen(false)
  }

  private dispatch(effects: readonly QueueEffect[]): void {
    for (const effect of effects) {
      if (effect.type === 'play') this.link?.send({ type: 'speak', id: effect.id, text: effect.text })
      else this.link?.send({ type: 'stop-speak', id: effect.id })
    }
  }

  private syncHold(): void {
    const hold = voiceHold(this.queue)
    if (hold === this.hold) return
    this.hold = hold
    this.options.send({ type: 'voice-hold', hold })
  }

  private pushConfigure(): void {
    this.link?.send({
      type: 'configure',
      settings: this.options.settings(),
      paths: this.options.paths?.(),
    })
  }

  private pushListen(force: boolean): void {
    const settings = this.options.settings()
    const presence = this.options.presence()
    const commandEnabled = settings.commandEnabled && presence.asr
    const mode = listenMode({
      pinned: this.pinned,
      agentBusy: this.agentBusy,
      questionOpen: this.questionOpen,
      bodyBusy: bodyBusy(this.queue),
      localBusy: localBusy(this.queue),
      // The stopping flag arrives with dismiss and the stop button. Until then a turn is not stopping.
      stopping: false,
      // An empty wake list means there is no wake word, even when the switch and the model are ready.
      wakeEnabled: settings.wakeEnabled && hasWakeWord(settings.wakeWords) && presence.wake,
      commandEnabled,
      // Punctuation alone never matches, so it must not keep transcription open during a turn.
      interjectEnabled: commandEnabled && normalizeUtterance(settings.interjectKeyword) !== '',
      // Echo cancellation is reported by a later mic message. Without it, body audio stays quiet.
      echoCancel: false,
      micOpen: this.micOpen,
    })
    if (!force && mode === this.mode) return
    // Leaving command mode ends any half-heard utterance: nothing is sent for it and
    // the idle clock must not stay paused on an edge the dead command mode never closes.
    if (this.mode === 'command' && mode !== 'command') this.speechOpen = false
    const entering = mode === 'command' && this.mode !== 'command'
    const seedMs = entering ? this.commandSeed : 0
    // Only the switch right after a spoken reply uses zero. Later entries get the normal
    // pre-roll back, so the first syllable after an agent turn is not clipped.
    if (entering) this.commandSeed = 300
    this.mode = mode
    this.link?.send({ type: 'listen', mode, seedMs })
    // The page draws the input meter only while this exact command column is listening.
    this.options.send({ type: 'voice-mode', mode })
    if (mode !== 'command') this.options.send({ type: 'voice-level', value: 0 })
  }

  private localReply(text: string): string {
    const reply = text.trim()
    if (!reply || !this.ttsOn()) return ''
    return reply
  }

  private ttsOn(): boolean {
    return this.options.settings().ttsEnabled && this.options.presence().tts
  }

  private sample() {
    return {
      now: this.options.now(),
      pinned: this.pinned,
      agentBusy: this.agentBusy,
      questionOpen: this.questionOpen,
      playbackBusy: queueView(this.queue).playbackBusy,
      speechOpen: this.speechOpen,
      idleMs: this.options.settings().idleMs,
    }
  }
}

/** A leading wake word is not a command. An empty remainder is dropped by the caller. */
export function stripWakePrefix(text: string, words: readonly string[]): string {
  const spoken = text.trim()
  for (const word of words) {
    const phrase = word.trim()
    if (!phrase || !spoken.startsWith(phrase)) continue
    return spoken.slice(phrase.length).trim()
  }
  return spoken
}

/**
 * Fork the voice child when this install has one beside the host.
 * A test run does not start it; the voice tests pass their own script.
 */
export function openVoiceChild(): VoiceLink | undefined {
  if (process.env.NODE_TEST_CONTEXT) return undefined
  const built = fileURLToPath(new URL('../voice/child.js', import.meta.url))
  if (existsSync(built)) return forkChild(built, [])
  const source = fileURLToPath(new URL('../../voice/src/child.ts', import.meta.url))
  if (existsSync(source)) {
    return forkChild(source, ['--experimental-transform-types', '--disable-warning=ExperimentalWarning'])
  }
  return undefined
}

function forkChild(script: string, execArgv: string[]): VoiceLink {
  // The desktop host is the Electron binary in Node mode. The child must keep that
  // marker, or Electron opens another app window instead of running the script.
  const child = fork(script, [], {
    execArgv,
    env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
    stdio: ['pipe', 'pipe', 'inherit', 'ipc'],
  })
  return linkProcess(child)
}

/** NDJSON over a child process's stdin and stdout. Lines that arrive before a handler are kept. */
export function linkProcess(child: ChildProcess): VoiceLink {
  const pending: unknown[] = []
  let handler: ((message: unknown) => void) | undefined
  const exits = new Set<() => void>()
  let exited = false
  const finish = () => {
    if (exited) return
    exited = true
    for (const exit of exits) exit()
  }
  if (child.stdout) {
    const lines = createInterface({ input: child.stdout })
    lines.on('line', (line) => {
      if (!line.trim()) return
      let message: unknown
      try {
        message = JSON.parse(line) as unknown
      } catch {
        return
      }
      if (handler) handler(message)
      else pending.push(message)
    })
  }
  // A spawn failure may never produce `exit`. Both mean the link is gone.
  child.once('error', finish)
  child.once('exit', finish)
  return {
    send(message) {
      if (exited || child.stdin === null || child.stdin.destroyed) return
      try {
        child.stdin.write(`${JSON.stringify(message)}\n`)
      } catch {
        finish()
      }
    },
    close() {
      child.kill()
    },
    onMessage(next) {
      handler = next
      const queued = pending.splice(0)
      for (const message of queued) next(message)
    },
    onExit(exit) {
      // The child may already have died between fork() and this registration. Defer so the
      // starting caller can finish wiring the link before the exit path runs.
      if (exited) queueMicrotask(exit)
      else exits.add(exit)
    },
  }
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null ? value as Record<string, unknown> : undefined
}
