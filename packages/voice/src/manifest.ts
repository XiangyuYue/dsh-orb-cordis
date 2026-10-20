/**
 * Official wake and TTS packages, and the official ASR download the dialog describes.
 * The dialog names these sources and sizes. A later update check compares hashes
 * against this list; it does not go looking for a newer filename.
 */

export type VoiceModelKind = 'wake' | 'tts' | 'asr'

export interface VoiceModelView {
  present: boolean
  downloading: boolean
  /** Bytes received divided by the offer size, from 0 to 1. */
  progress: number
  sources: readonly string[]
  bytes: number
  error: string
  /** Set on the download response when the files are already current. */
  notice?: 'present'
  /**
   * ASR only. False when this DeepSeek Harness has no official SenseVoice
   * provider, so the page explains that instead of starting a download.
   */
  official?: boolean
}

export interface VoiceModels {
  wake: VoiceModelView
  tts: VoiceModelView
  asr: VoiceModelView
}

export const WAKE_MODEL_URL = 'https://github.com/k2-fsa/sherpa-onnx/releases/download/kws-models/sherpa-onnx-kws-zipformer-zh-en-3M-2025-12-20.tar.bz2'

/** Unpacked size the download dialog shows: about 38 MB. */
export const WAKE_MODEL_BYTES = 38 * 1024 * 1024

export const TTS_ZH_URL = 'https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/matcha-icefall-zh-baker.tar.bz2'
export const TTS_EN_URL = 'https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/matcha-icefall-en_US-ljspeech.tar.bz2'
export const TTS_VOCODER_URL = 'https://github.com/k2-fsa/sherpa-onnx/releases/download/vocoder-models/vocos-22khz-univ.onnx'

export const TTS_ZH_MODEL_SHA256 = 'ff1cc7f7abdedc4eeec668a4a0dc2e72a0c314c5637d5fce885345b490bd08de'
export const TTS_EN_MODEL_SHA256 = '4d7771c0ec063ca74f2fa92ba0ecfe14f73fa3f61c236d9469b92e102d8e9574'
export const TTS_VOCODER_SHA256 = '0574a135aa1db2de6e181050db2ec528496cacd4a4701fc5d7faf9f9804c0081'

/** On-disk size the download dialog shows: about 214 MB. */
export const TTS_MODEL_BYTES = 214 * 1024 * 1024

/** Official SenseVoice int8 trio: model + tokens + silero. The dialog says about 230 MB. */
export const ASR_MODEL_BYTES = 239_233_841 + 315_894 + 1_807_522

export const ASR_SOURCES = ['https://huggingface.co', 'https://hf-mirror.com'] as const

/** What the settings page shows before any model file is on disk. */
export function absentVoiceModels(): VoiceModels {
  return {
    wake: view([WAKE_MODEL_URL], WAKE_MODEL_BYTES),
    tts: view([TTS_ZH_URL, TTS_EN_URL, TTS_VOCODER_URL], TTS_MODEL_BYTES),
    asr: view(ASR_SOURCES, ASR_MODEL_BYTES),
  }
}

function view(sources: readonly string[], bytes: number): VoiceModelView {
  return { present: false, downloading: false, progress: 0, sources, bytes, error: '' }
}
