/**
 * Which decoder the one open microphone feeds.
 * Host computes this from the ball's pin, the turn, the question card, playback,
 * and whether each model is switched on and present. The child only applies it.
 */

export type ListenMode = 'off' | 'wake' | 'command'

export interface ListenInput {
  /** The panel is pinned. Hover-open does not count. */
  readonly pinned: boolean
  /** The floating-ball agent is in a turn. */
  readonly agentBusy: boolean
  /** A question card is waiting for a click. */
  readonly questionOpen: boolean
  /**
   * The speaker has audio, or the queue still holds a closing line, a question
   * prompt, a wake reply, or a dismiss reply. TTS being off never sets this.
   */
  readonly playbackBusy: boolean
  /** Wake switch is on and the wake model files are complete. */
  readonly wakeEnabled: boolean
  /** Voice-input switch is on and the official ASR model files are complete. */
  readonly commandEnabled: boolean
  /** The child process has the microphone. */
  readonly micOpen: boolean
}

/**
 * `off`, `wake`, or `command`.
 *
 * A busy agent, an open question card, or playback wins and closes both ears.
 * Otherwise an unpinned ball listens for the wake word, and a pinned ball
 * listens for a command. A column whose switch is off or whose model is missing
 * does not happen. A closed microphone closes both.
 */
export function listenMode(input: ListenInput): ListenMode {
  if (input.agentBusy || input.questionOpen || input.playbackBusy) return 'off'
  if (!input.micOpen) return 'off'
  if (!input.pinned && input.wakeEnabled) return 'wake'
  if (input.pinned && input.commandEnabled) return 'command'
  return 'off'
}
