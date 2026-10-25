/**
 * Every file the Matcha engines and the vocoder need, with its size.
 * The English package ships espeak dictionaries for every language; only the
 * English core and the `lang/gmw` definitions are used by this engine, so the
 * download fetches those 18 files instead of all 355.
 */

export interface TtsFile {
  readonly path: string
  readonly bytes: number
}

export const TTS_ZH_FILES: readonly TtsFile[] = [
  { path: 'date.fst', bytes: 59154 },
  { path: 'lexicon.txt', bytes: 1363705 },
  { path: 'model-steps-3.onnx', bytes: 75624188 },
  { path: 'number.fst', bytes: 64482 },
  { path: 'phone.fst', bytes: 88630 },
  { path: 'tokens.txt', bytes: 19591 },
]

export const TTS_EN_FILES: readonly TtsFile[] = [
  { path: 'espeak-ng-data/en_dict', bytes: 166944 },
  { path: 'espeak-ng-data/intonations', bytes: 2040 },
  { path: 'espeak-ng-data/lang/gmw/af', bytes: 123 },
  { path: 'espeak-ng-data/lang/gmw/de', bytes: 42 },
  { path: 'espeak-ng-data/lang/gmw/en', bytes: 140 },
  { path: 'espeak-ng-data/lang/gmw/en-029', bytes: 335 },
  { path: 'espeak-ng-data/lang/gmw/en-GB-scotland', bytes: 295 },
  { path: 'espeak-ng-data/lang/gmw/en-GB-x-gbclan', bytes: 238 },
  { path: 'espeak-ng-data/lang/gmw/en-GB-x-gbcwmd', bytes: 188 },
  { path: 'espeak-ng-data/lang/gmw/en-GB-x-rp', bytes: 249 },
  { path: 'espeak-ng-data/lang/gmw/en-US', bytes: 257 },
  { path: 'espeak-ng-data/lang/gmw/en-US-nyc', bytes: 271 },
  { path: 'espeak-ng-data/lang/gmw/lb', bytes: 31 },
  { path: 'espeak-ng-data/lang/gmw/nl', bytes: 23 },
  { path: 'espeak-ng-data/phondata', bytes: 550424 },
  { path: 'espeak-ng-data/phondata-manifest', bytes: 21821 },
  { path: 'espeak-ng-data/phonindex', bytes: 39074 },
  { path: 'espeak-ng-data/phontab', bytes: 55796 },
  { path: 'model-steps-3.onnx', bytes: 74157257 },
  { path: 'tokens.txt', bytes: 954 },
]

export const TTS_VOCODER = { repo: 'k2-fsa/sherpa-onnx-models', path: 'vocoder-models/vocos-22khz-univ.onnx', local: 'vocos-22khz-univ.onnx', bytes: 53884024 } as const

export const TTS_BYTES = 206100276
