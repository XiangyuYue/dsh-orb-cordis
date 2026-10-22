/**
 * Speaker notices that are not failures.
 * A cloud sentence is buffered as it arrives, so CPAL occasionally reports an
 * underrun when the network pauses; its callback has already written silence and
 * the next chunk resumes normally. Ending the sentence there would cut it short.
 */

export function speakerErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message?: unknown }).message
    if (typeof message === 'string') return message
  }
  return String(error)
}

export function isRecoverableSpeakerError(error: unknown): boolean {
  return /underrun|overrun/i.test(speakerErrorMessage(error))
}
