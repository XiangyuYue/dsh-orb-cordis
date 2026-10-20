/**
 * Download the wake and TTS models the plugin owns, and ask DeepSeek Harness
 * for the official ASR model. A second click while a transfer is running
 * reports the current one instead of starting another.
 */

import { createHash } from 'node:crypto'
import { spawn } from 'node:child_process'
import { createWriteStream } from 'node:fs'
import { copyFile, mkdir, readFile, rename, rm, stat, symlink } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { finished } from 'node:stream/promises'
import { absentVoiceModels, ASR_MODEL_BYTES, TTS_EN_MODEL_SHA256, TTS_EN_URL, TTS_VOCODER_SHA256, TTS_VOCODER_URL, TTS_ZH_MODEL_SHA256, TTS_ZH_URL, WAKE_MODEL_URL, type VoiceModelKind, type VoiceModels } from '@dsh-orb/voice/manifest'
import { asrPresent, kwsPresent, ttsPresent } from './voice-models.ts'

export interface VoiceModelPaths {
  readonly kws: string
  readonly asr: string
  readonly tts: string
}

interface Job {
  received: number
  total: number
  error: string
}

/** The slice of `ctx.speechToText` this plugin uses. It never calls `transcribe()`. */
export interface OfficialAsr {
  /** Undefined when `sensevoice-local` is not registered. */
  sources(): readonly string[] | undefined
  prepare(): void
  state(): { phase: string, completedBytes?: number, totalBytes?: number, message?: string }
}

const NO_OFFICIAL_ASR = '当前 DeepSeek Harness 没有官方语音识别服务，插件不会自己另下一份'

interface SpeechService {
  prepare?: (id: string) => void
  snapshot?: () => {
    providers?: readonly {
      id?: string
      downloadSources?: readonly string[]
      preparation?: { phase?: string, completedBytes?: number, totalBytes?: number, message?: string }
    }[]
  }
}

/** Reads `ctx.get('speechToText')`. A missing service is not an error; the page explains it. */
export function officialAsrFrom(service: unknown): OfficialAsr | undefined {
  if (!service || typeof service !== 'object') return undefined
  const speech = service as SpeechService
  if (typeof speech.prepare !== 'function' || typeof speech.snapshot !== 'function') return undefined
  const prepare = speech.prepare.bind(speech)
  const snapshot = speech.snapshot.bind(speech)
  return {
    sources() {
      const provider = snapshot().providers?.find((item) => item.id === 'sensevoice-local')
      if (!provider) return undefined
      return (provider.downloadSources ?? []).filter((item) => item !== '')
    },
    prepare() { prepare('sensevoice-local') },
    state() {
      const provider = snapshot().providers?.find((item) => item.id === 'sensevoice-local')
      const phase = provider?.preparation?.phase
      return {
        phase: typeof phase === 'string' ? phase : 'unprepared',
        completedBytes: provider?.preparation?.completedBytes,
        totalBytes: provider?.preparation?.totalBytes,
        message: provider?.preparation?.message,
      }
    },
  }
}

const KWS_ARCHIVE = 'sherpa-onnx-kws-zipformer-zh-en-3M-2025-12-20.tar.bz2'

/** Official URL first, then the mirrors the landing notes already use. */
export function modelUrls(kind: 'wake' | 'tts-zh' | 'tts-en' | 'tts-vocoder'): readonly string[] {
  const official = kind === 'wake' ? WAKE_MODEL_URL : kind === 'tts-zh' ? TTS_ZH_URL : kind === 'tts-en' ? TTS_EN_URL : TTS_VOCODER_URL
  const file = official.slice(official.lastIndexOf('/') + 1)
  const hf = kind === 'wake'
    ? `https://huggingface.co/csukuangfj/sherpa-onnx-kws-zipformer-zh-en-3M-2025-12-20/resolve/main/${KWS_ARCHIVE}`
    : ''
  return [
    official,
    `https://ghproxy.net/${official}`,
    ...(hf ? [hf.replace('https://huggingface.co', 'https://hf-mirror.com'), hf] : []),
  ].filter((url, index, all) => url !== '' && all.indexOf(url) === index)
}

export class VoiceDownloads {
  private readonly jobs = new Map<VoiceModelKind, Job>()
  private readonly errors = new Map<VoiceModelKind, string>()

  private readonly install: (kind: VoiceModelKind, paths: VoiceModelPaths, progress: (received: number, total: number) => void) => Promise<void>

  private asrTimer: ReturnType<typeof setInterval> | undefined

  constructor(
    private readonly paths: () => VoiceModelPaths,
    install?: (kind: VoiceModelKind, paths: VoiceModelPaths, progress: (received: number, total: number) => void) => Promise<void>,
    private readonly onReady?: () => void,
    private readonly speech?: () => OfficialAsr | undefined,
  ) {
    this.install = install ?? installVoiceModel
  }

  view(): VoiceModels {
    const base = absentVoiceModels()
    const paths = this.paths()
    const listed = this.official()?.sources()
    return {
      wake: this.decorate(base.wake, 'wake', kwsPresent(paths.kws)),
      tts: this.decorate(base.tts, 'tts', ttsPresent(paths.tts)),
      asr: {
        ...this.decorate(base.asr, 'asr', asrPresent(paths.asr)),
        official: listed !== undefined,
        ...(listed && listed.length > 0 ? { sources: listed } : {}),
      },
    }
  }

  async begin(kind: VoiceModelKind): Promise<'started' | 'busy' | 'present'> {
    if (this.jobs.has(kind)) return 'busy'
    if (await this.current(kind)) return 'present'
    // Two clicks can both pass the checks above while `current()` hashes the TTS files.
    // Only the first may start the transfer.
    if (this.jobs.has(kind)) return 'busy'
    if (kind === 'asr') return this.beginAsr()
    this.errors.delete(kind)
    this.jobs.set(kind, { received: 0, total: 1, error: '' })
    void this.install(kind, this.paths(), (received, total) => {
      const job = this.jobs.get(kind)
      if (!job) return
      job.received = received
      job.total = Math.max(total, 1)
    }).then(() => {
      this.jobs.delete(kind)
      this.errors.delete(kind)
      this.onReady?.()
    }).catch((error: unknown) => {
      this.jobs.delete(kind)
      this.errors.set(kind, error instanceof Error ? error.message : String(error))
    })
    return 'started'
  }

  private beginAsr(): 'started' | 'busy' | 'present' {
    const speech = this.official()
    if (!speech || speech.sources() === undefined) {
      this.errors.set('asr', NO_OFFICIAL_ASR)
      return 'started'
    }
    this.errors.delete('asr')
    this.jobs.set('asr', { received: 0, total: ASR_MODEL_BYTES, error: '' })
    try {
      speech.prepare()
    } catch (error) {
      this.jobs.delete('asr')
      this.errors.set('asr', error instanceof Error ? error.message : String(error))
      return 'started'
    }
    this.watchAsr()
    return 'started'
  }

  private official(): OfficialAsr | undefined {
    try {
      return this.speech?.()
    } catch {
      return undefined
    }
  }

  private watchAsr(): void {
    if (this.asrTimer) clearInterval(this.asrTimer)
    this.pollAsr()
    this.asrTimer = setInterval(() => { this.pollAsr() }, 200)
  }

  private stopAsr(): void {
    if (!this.asrTimer) return
    clearInterval(this.asrTimer)
    this.asrTimer = undefined
  }

  private pollAsr(): void {
    if (!this.jobs.has('asr')) {
      this.stopAsr()
      return
    }
    const state = this.official()?.state()
    if (!state) return
    const job = this.jobs.get('asr')
    if (!job) return
    if (state.phase === 'downloading') {
      const total = state.totalBytes && state.totalBytes > 0 ? state.totalBytes : job.total
      job.received = state.completedBytes ?? 0
      job.total = total
      return
    }
    if (state.phase !== 'ready' && state.phase !== 'standby' && state.phase !== 'failed' && state.phase !== 'cancelled') return
    this.stopAsr()
    this.jobs.delete('asr')
    if (state.phase === 'failed' || state.phase === 'cancelled') {
      this.errors.set('asr', state.message && state.message !== '' ? state.message : '下载失败')
      return
    }
    if (asrPresent(this.paths().asr)) {
      this.errors.delete('asr')
      this.onReady?.()
      return
    }
    this.errors.set('asr', '官方语音识别模型不完整')
  }

  private decorate(base: VoiceModels['wake'], kind: VoiceModelKind, present: boolean): VoiceModels['wake'] {
    const job = this.jobs.get(kind)
    return {
      ...base,
      present: present && job === undefined,
      downloading: job !== undefined,
      progress: job === undefined || job.total <= 0 ? 0 : Math.min(1, job.received / job.total),
      error: this.errors.get(kind) ?? '',
    }
  }

  private async current(kind: VoiceModelKind): Promise<boolean> {
    const paths = this.paths()
    if (kind === 'wake') return kwsPresent(paths.kws)
    if (kind === 'asr') return asrPresent(paths.asr)
    if (!ttsPresent(paths.tts)) return false
    const zh = await sha256(join(paths.tts, 'matcha-icefall-zh-baker', 'model-steps-3.onnx'))
    const en = await sha256(join(paths.tts, 'matcha-icefall-en_US-ljspeech', 'model-steps-3.onnx'))
    const vocoder = await sha256(join(paths.tts, 'vocos-22khz-univ.onnx'))
    return zh === TTS_ZH_MODEL_SHA256 && en === TTS_EN_MODEL_SHA256 && vocoder === TTS_VOCODER_SHA256
  }
}

/** Three TTS files share one bar. Unknown files are guessed from the largest known size, so the bar does not jump backward when the next file starts. */
function createProgress(files: number, progress: (received: number, total: number) => void): {
  report(index: number, received: number, total: number): void
  skip(index: number, bytes: number): void
} {
  const known = Array<number>(files).fill(0)
  const got = Array<number>(files).fill(0)
  const publish = (): void => {
    const received = got.reduce((sum, value) => sum + value, 0)
    const knownSum = known.reduce((sum, value) => sum + value, 0)
    const pending = known.filter((value) => value <= 0).length
    const standIn = known.reduce((max, value) => Math.max(max, value), 0)
    progress(received, Math.max(knownSum + pending * standIn, received, 1))
  }
  return {
    report(index, received, total) {
      got[index] = received
      if (total > 0) known[index] = total
      publish()
    },
    skip(index, bytes) {
      const size = Math.max(bytes, 1)
      got[index] = size
      known[index] = size
      publish()
    },
  }
}

async function installVoiceModel(
  kind: VoiceModelKind,
  paths: VoiceModelPaths,
  progress: (received: number, total: number) => void,
): Promise<void> {
  if (kind === 'wake') {
    await installArchive(modelUrls('wake'), paths.kws, progress)
    if (!kwsPresent(paths.kws)) throw new Error('语音唤醒模型不完整')
    return
  }
  const staging = `${paths.tts}.staging`
  await mkdir(staging, { recursive: true })
  const parts = [
    ['tts-zh', TTS_ZH_MODEL_SHA256, 'matcha-icefall-zh-baker', 'model-steps-3.onnx'],
    ['tts-en', TTS_EN_MODEL_SHA256, 'matcha-icefall-en_US-ljspeech', 'model-steps-3.onnx'],
  ] as const
  const piece = createProgress(3, progress)
  let index = 0
  for (const [id, hash, dir, file] of parts) {
    const model = join(staging, dir, file)
    if (await sha256(model).catch(() => '') === hash) {
      piece.skip(index, (await stat(model)).size)
      index += 1
      continue
    }
    await rm(join(staging, dir), { recursive: true, force: true })
    const archive = join(staging, `${dir}.tar.bz2`)
    await downloadFirst(modelUrls(id), archive, (got, total) => piece.report(index, got, total))
    await extractArchive(archive, staging)
    const hashed = await sha256(model)
    if (hashed !== hash) throw new Error(`${file} 校验失败`)
    piece.skip(index, (await stat(archive)).size)
    await rm(archive, { force: true })
    index += 1
  }
  const vocoder = join(staging, 'vocos-22khz-univ.onnx')
  if (await sha256(vocoder).catch(() => '') !== TTS_VOCODER_SHA256) {
    await downloadFirst(modelUrls('tts-vocoder'), vocoder, (got, total) => piece.report(2, got, total))
    if (await sha256(vocoder) !== TTS_VOCODER_SHA256) throw new Error('vocoder 校验失败')
  }
  piece.skip(2, (await stat(vocoder)).size)
  for (const dir of ['matcha-icefall-zh-baker', 'matcha-icefall-en_US-ljspeech']) {
    // Not needed by the engines; leaving it in would put a second jieba dictionary on disk.
    await rm(join(staging, dir, 'dict'), { recursive: true, force: true })
    await rm(join(staging, dir, 'vocoder.onnx'), { force: true })
    // One vocoder on disk. Windows refuses a symlink without Developer Mode, so copy there.
    try {
      await symlink('../vocos-22khz-univ.onnx', join(staging, dir, 'vocoder.onnx'))
    } catch {
      await copyFile(vocoder, join(staging, dir, 'vocoder.onnx'))
    }
  }
  await rm(paths.tts, { recursive: true, force: true })
  await mkdir(dirname(paths.tts), { recursive: true })
  await rename(staging, paths.tts)
}

async function installArchive(urls: readonly string[], dest: string, progress: (received: number, total: number) => void): Promise<void> {
  const staging = `${dest}.staging`
  const archive = `${dest}.download`
  await rm(staging, { recursive: true, force: true })
  await rm(archive, { force: true })
  await mkdir(staging, { recursive: true })
  await downloadFirst(urls, archive, progress)
  await extractArchive(archive, staging)
  const found = await findModelDir(staging)
  await rm(dest, { recursive: true, force: true })
  await mkdir(dirname(dest), { recursive: true })
  await rename(found, dest)
  await rm(archive, { force: true })
  await rm(staging, { recursive: true, force: true })
}

async function findModelDir(root: string): Promise<string> {
  const { readdir } = await import('node:fs/promises')
  if (kwsPresent(root)) return root
  for (const name of await readdir(root)) {
    const dir = join(root, name)
    if (kwsPresent(dir)) return dir
  }
  throw new Error('解压后没有找到唤醒模型')
}

async function downloadFirst(
  urls: readonly string[],
  dest: string,
  progress: (received: number, total: number) => void,
): Promise<void> {
  let last = '下载失败'
  for (const url of urls) {
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        await downloadOne(url, dest, progress)
        return
      } catch (error) {
        last = error instanceof Error ? error.message : String(error)
        if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, 1000 * attempt))
      }
    }
    await rm(dest, { force: true })
  }
  throw new Error(last)
}

async function downloadOne(url: string, dest: string, progress: (received: number, total: number) => void): Promise<void> {
  await mkdir(dirname(dest), { recursive: true })
  let already = 0
  try {
    already = (await stat(dest)).size
  } catch {
    already = 0
  }
  const headers: Record<string, string> = already > 0 ? { range: `bytes=${already}-` } : {}
  const response = await fetch(url, { redirect: 'follow', headers })
  const body = response.body
  if (response.status === 416 && already > 0) {
    progress(already, already)
    return
  }
  if (!response.ok || body === null) throw new Error(`${response.status} ${url}`)
  const resume = response.status === 206 && already > 0
  const length = Number(response.headers.get('content-length') ?? 0)
  const total = resume ? already + length : length
  const file = createWriteStream(dest, { flags: resume ? 'a' : 'w' })
  const reader = body.getReader()
  let received = resume ? already : 0
  try {
    for (;;) {
      const chunk = await reader.read()
      if (chunk.done) break
      const bytes = Buffer.from(chunk.value)
      if (!file.write(bytes)) await onceDrain(file)
      received += bytes.length
      progress(received, total > 0 ? total : received)
    }
  } catch (error) {
    file.destroy()
    throw error
  } finally {
    if (!file.destroyed) file.end()
  }
  await finished(file)
}

function onceDrain(file: NodeJS.WritableStream): Promise<void> {
  return new Promise((resolve) => file.once('drain', () => resolve()))
}

function extractArchive(archive: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn('tar', ['-xjf', archive, '-C', dest])
    let stderr = ''
    child.stderr?.on('data', (chunk: Buffer) => { stderr += chunk.toString('utf8') })
    child.on('error', reject)
    child.on('exit', (code) => {
      if (code === 0) resolve()
      else reject(new Error(stderr.trim() || `tar exited ${code}`))
    })
  })
}

async function sha256(file: string): Promise<string> {
  const hash = createHash('sha256')
  hash.update(await readFile(file))
  return hash.digest('hex')
}
