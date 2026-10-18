/**
 * Retention for the floating-ball workspace history.
 *
 * A cleanup moves whole sessions — their logs and the image attachments they alone
 * reference — into a local trash directory. DSH has no session-deletion API, so the
 * session is first archived through the official Workspace controller (which hides it
 * and refuses to wake it), then its directory is moved out of the persistence root.
 * The trash manifest is written before anything moves, so a crash or quit mid-cleanup
 * can be put back on the next start.
 */

import { randomBytes } from 'node:crypto'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { cp, mkdir, readdir, rename, rm, stat, writeFile } from 'node:fs/promises'
import { basename, dirname, isAbsolute, join, relative, resolve } from 'node:path'
import { dshHomePath } from '@deepseek-ai/dsh-home-paths'
import type { ProfileStore } from './preferences.ts'

/** One row from the official Session list. Only the fields retention reads are named. */
export interface HistorySessionRow {
  readonly sessionId: string
  /** Last chat (last prompt), which is what a retention day counts. */
  readonly updatedAt?: number
  readonly running?: boolean
  readonly parentSessionId?: string
  readonly origin?: string
  readonly cwd?: string
  readonly projections?: {
    readonly values?: {
      readonly agentPreset?: string
      readonly title?: string
    }
  }
}

/** The persisted Session header fields the graph needs. */
export interface HistorySessionHeader {
  readonly id: string
  readonly cwd?: string
  readonly parentSession?: string
  readonly origin?: string
  readonly createdAt?: number
}

/** One stored Session snapshot; `sizeBytes` is the physical log size. */
export interface HistorySessionSnapshot {
  readonly header: HistorySessionHeader
  readonly sizeBytes?: number
}

/** A read handle from the official persistence service. */
export interface HistorySessionHandle {
  read(): Promise<{ readonly events?: readonly unknown[] }>
  close(): Promise<void>
}

/** The slice of `ctx.sessionPersistence` retention uses. */
export interface HistoryPersistence {
  list(options?: { readonly signal?: AbortSignal }): Promise<readonly HistorySessionSnapshot[]>
  stat(id: string, options?: { readonly signal?: AbortSignal }): Promise<HistorySessionSnapshot | undefined>
  open(id: string, mode: 'read'): Promise<HistorySessionHandle>
  /** JSONL backend convenience: the absolute log path for one header. */
  locate?(header: HistorySessionHeader): { readonly path?: string } | undefined
}

/** Workspace archive/pin sets, read before a run so neither kind is ever deleted. */
export interface WorkspaceSafety {
  readonly pinned: readonly string[]
  readonly archived: readonly string[]
}

/** One cleanup batch kept under the trash root. */
export interface HistoryTrashBatch {
  readonly version: 1
  readonly batchId: string
  readonly createdAt: number
  readonly status: 'planned' | 'moving' | 'complete'
  readonly workspace: string
  readonly retentionDays: number
  readonly sessions: readonly HistoryTrashSession[]
  readonly images: readonly HistoryTrashImage[]
  readonly archived: readonly string[]
}

export interface HistoryTrashSession {
  readonly id: string
  readonly parentSessionId?: string
  readonly origin?: string
  /** Absolute original session directory. Restore validates it stays under the sessions root. */
  readonly dir: string
  readonly bytes: number
}

export interface HistoryTrashImage {
  readonly id: string
  readonly bytes: number
}

/** A batch summary for the settings card. */
export interface HistoryTrashSummary {
  readonly id: string
  readonly createdAt: number
  readonly status: HistoryTrashBatch['status']
  readonly sessions: number
  readonly images: number
  readonly bytes: number
}

export interface HistoryState {
  readonly available: boolean
  readonly workspacePath: string
  readonly retentionDays: number
  readonly cleaning: boolean
  readonly phase: string
  readonly error: string | null
  readonly lastCleanupAt: number | null
  readonly lastDeletedSessions: number
  readonly lastMovedBytes: number
  readonly trashBytes: number
  readonly trashBatches: readonly HistoryTrashSummary[]
}

/** State shown when a Host has no persistence/archive services to clean with. */
export const EMPTY_HISTORY_STATE: HistoryState = {
  available: false,
  workspacePath: '',
  retentionDays: 0,
  cleaning: false,
  phase: '',
  error: null,
  lastCleanupAt: null,
  lastDeletedSessions: 0,
  lastMovedBytes: 0,
  trashBytes: 0,
  trashBatches: [],
}

export interface HistoryPreview {
  readonly days: number
  readonly cutoff: number
  readonly roots: number
  readonly members: number
  readonly images: number
  readonly bytes: number
  readonly oldest: number | null
  readonly newest: number | null
  readonly skipped: HistorySkipCounts
}

export interface HistorySkipCounts {
  active: number
  pinned: number
  archived: number
  current: number
  unchanged: number
  unreadable: number
}

export interface HistoryDeps {
  readonly store: ProfileStore
  readonly workspacePath: () => string
  readonly currentSession: () => string | undefined
  readonly listSessions: () => Promise<readonly HistorySessionRow[]>
  /** True while a Session has an attached Agent or its UI is open. */
  readonly isAttached: (id: string) => boolean
  readonly workspaceSafety: () => Promise<WorkspaceSafety>
  readonly archive: (id: string) => Promise<void>
  readonly unarchive: (id: string) => Promise<void>
  /** Resolved lazily so a late-mounted service is still usable. */
  readonly persistence: () => HistoryPersistence | undefined
  readonly available: () => boolean
  readonly sessionsRoot: string
  readonly objectsRoot: string
  readonly trashRoot: string
  readonly now?: () => number
  readonly log?: (message: string) => void
}

/** How long a completed trash batch stays recoverable before it is permanently deleted. */
export const TRASH_RETENTION_MS = 7 * 24 * 60 * 60 * 1000

/** First automatic check after startup; long enough for the app to settle. */
export const HISTORY_FIRST_CHECK_MS = 60 * 1000

/** How often a finite retention is checked while the app stays open. */
export const HISTORY_INTERVAL_MS = 24 * 60 * 60 * 1000

const DAY_MS = 24 * 60 * 60 * 1000
const MOVE_ATTEMPTS = 5
const MOVE_BACKOFF_MS = 50
const SHA256_REF = /sha256:[0-9a-f]{64}/g

/** A candidate session plus everything a run needs to move it. */
interface CandidateTree {
  readonly root: HistorySessionRow
  readonly members: readonly HistorySessionRow[]
  readonly sessions: ReadonlyMap<string, HistorySessionSnapshot>
  readonly dirs: ReadonlyMap<string, string>
  readonly images: ReadonlyMap<string, number>
  readonly logBytes: number
  readonly newest: number
  readonly oldest: number
}

interface HistoryPlan {
  readonly cutoff: number
  readonly trees: readonly CandidateTree[]
  readonly images: ReadonlyMap<string, number>
  readonly logBytes: number
  readonly skipped: HistorySkipCounts
  readonly unreadable: number
}

class HistoryUnavailableError extends Error {}

/**
 * Retention, preview, cleanup, and the local trash.
 * The class never decides whether a service exists; {@link HistoryDeps.available}
 * and the injected functions keep every composition explicit.
 */
export class HistoryCleaner {
  private readonly deps: HistoryDeps
  private cleaning = false
  private phase = ''
  private error: string | null = null
  private timer: ReturnType<typeof setTimeout> | undefined
  private interval: ReturnType<typeof setInterval> | undefined

  constructor(deps: HistoryDeps) {
    this.deps = deps
  }

  /** State rendered by the settings card; never scans session logs. */
  state(): HistoryState {
    const history = this.deps.store.history()
    const batches = this.readBatches()
    return {
      available: this.available(),
      workspacePath: this.deps.workspacePath(),
      retentionDays: history.retentionDays,
      cleaning: this.cleaning,
      phase: this.phase,
      error: this.error,
      lastCleanupAt: history.lastCleanupAt === 0 ? null : history.lastCleanupAt,
      lastDeletedSessions: history.lastDeletedSessions,
      lastMovedBytes: history.lastMovedBytes,
      trashBytes: batches.reduce((sum, batch) => sum + batch.bytes, 0),
      trashBatches: batches,
    }
  }

  /** Persist a retention policy. 0 means forever and deletes nothing. */
  setRetention(days: number): void {
    if (!Number.isInteger(days) || days < 0 || days > 3650) throw new Error('invalid-retention')
    this.deps.store.setHistoryRecord({ retentionDays: days })
    this.error = null
  }

  /** Read-only count of what the current policy would move. */
  async preview(days: number): Promise<HistoryPreview> {
    this.assertAvailable()
    if (!Number.isInteger(days) || days < 0 || days > 3650) throw new Error('invalid-retention')
    if (days === 0) {
      return {
        days,
        cutoff: 0,
        roots: 0,
        members: 0,
        images: 0,
        bytes: 0,
        oldest: null,
        newest: null,
        skipped: emptySkips(),
      }
    }
    const plan = await this.plan(days)
    let bytes = plan.logBytes
    for (const size of plan.images.values()) bytes += size
    return {
      days,
      cutoff: plan.cutoff,
      roots: plan.trees.length,
      members: plan.trees.reduce((sum, tree) => sum + tree.members.length, 0),
      images: plan.images.size,
      bytes,
      oldest: plan.trees.length === 0 ? null : Math.min(...plan.trees.map((tree) => tree.oldest)),
      newest: plan.trees.length === 0 ? null : Math.max(...plan.trees.map((tree) => tree.newest)),
      skipped: plan.skipped,
    }
  }

  /** Start a cleanup and return at once; the card polls {@link state}. */
  startClean(): void {
    if (this.cleaning) return
    this.cleaning = true
    this.phase = 'scanning'
    this.error = null
    void this.clean().catch((error: unknown) => {
      this.error = messageOf(error)
      this.log(`history cleanup failed: ${this.error}`)
    }).finally(() => {
      this.cleaning = false
      this.phase = ''
    })
  }

  /** Serialize the daily repair with a cleanup; a restore must not overlap a move. */
  private async recoverThenClean(): Promise<void> {
    await this.recoverAndPurge()
    this.startClean()
  }

  /** Recover interrupted batches, drop expired trash, and schedule daily checks. */
  start(): () => void {
    void this.recover()
    this.timer = setTimeout(() => {
      this.timer = undefined
      void this.recoverThenClean()
    }, HISTORY_FIRST_CHECK_MS)
    this.timer.unref()
    this.interval = setInterval(() => { void this.recoverThenClean() }, HISTORY_INTERVAL_MS)
    this.interval.unref()
    return () => {
      if (this.timer !== undefined) clearTimeout(this.timer)
      if (this.interval !== undefined) clearInterval(this.interval)
      this.timer = undefined
      this.interval = undefined
    }
  }

  /** Startup repair and expiry; public so a test (or a manual retry) can drive it. */
  async recover(): Promise<void> {
    await this.recoverAndPurge()
  }

  /** Delete every trash batch now; archived session ids remain hidden by the Workspace. */
  async emptyTrash(): Promise<void> {
    if (this.cleaning) throw new Error('history-busy')
    this.cleaning = true
    try {
      for (const dir of this.readBatchDirs()) await rm(dir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 })
    } finally {
      this.cleaning = false
    }
  }

  /** Restore one batch (newest by default): move files back and unarchive its sessions. */
  async restore(batchId?: string): Promise<void> {
    if (this.cleaning) throw new Error('history-busy')
    if (batchId !== undefined && !isBatchId(batchId)) throw new Error('invalid-batch')
    this.cleaning = true
    try {
      if (batchId !== undefined) {
        const dir = this.readBatchDirs().find((candidate) => basename(candidate) === batchId)
        if (dir === undefined) throw new Error('trash-empty')
        const manifest = this.readManifest(dir)
        if (manifest === undefined) throw new Error('trash-corrupt')
        await this.restoreBatch(dir, manifest)
        return
      }
      let chosen: { dir: string; manifest: HistoryTrashBatch } | undefined
      for (const dir of this.readBatchDirs()) {
        const manifest = this.readManifest(dir)
        if (manifest === undefined) continue
        if (chosen === undefined || manifest.createdAt > chosen.manifest.createdAt) chosen = { dir, manifest }
      }
      if (chosen === undefined) throw new Error('trash-empty')
      await this.restoreBatch(chosen.dir, chosen.manifest)
    } finally {
      this.cleaning = false
    }
  }

  private available(): boolean {
    try {
      return this.deps.available()
    } catch {
      return false
    }
  }

  private assertAvailable(): void {
    if (!this.available()) throw new HistoryUnavailableError('history-unavailable')
  }

  /** Plan one run. Preview skips the live-reference scan; cleanup needs it. */
  private async plan(days: number): Promise<HistoryPlan> {
    const persistence = this.deps.persistence()
    if (persistence === undefined) throw new HistoryUnavailableError('history-unavailable')
    const now = this.now()
    const cutoff = now - days * DAY_MS
    const [snapshots, rows, safety] = await Promise.all([
      persistence.list({ signal: AbortSignal.timeout(30_000) }),
      this.deps.listSessions(),
      this.deps.workspaceSafety(),
    ])
    const rowById = new Map(rows.map((row) => [row.sessionId, row]))
    const snapshotById = new Map(snapshots.map((snapshot) => [snapshot.header.id, snapshot]))
    const pinned = new Set(safety.pinned)
    const archived = new Set(safety.archived)
    const children = new Map<string, Set<string>>()
    const addChild = (parent: string | undefined, id: string, origin: string | undefined): void => {
      if (parent === undefined || origin !== 'subagent') return
      const set = children.get(parent)
      if (set === undefined) children.set(parent, new Set([id]))
      else set.add(id)
    }
    for (const snapshot of snapshots) addChild(snapshot.header.parentSession, snapshot.header.id, snapshot.header.origin)
    for (const row of rows) addChild(row.parentSessionId, row.sessionId, row.origin)
    const skipped = emptySkips()
    const trees: CandidateTree[] = []
    const workspace = resolve(this.deps.workspacePath())
    for (const row of rows) {
      if (!isOrbRoot(row, workspace)) continue
      if (row.updatedAt === undefined || !Number.isFinite(row.updatedAt) || row.updatedAt <= 0) {
        skipped.unchanged += 1
        continue
      }
      if (row.updatedAt >= cutoff) {
        skipped.unchanged += 1
        continue
      }
      const tree = await this.candidateTree(row, children, rowById, snapshotById, pinned, archived, cutoff, skipped)
      if (tree !== undefined) trees.push(tree)
    }
    // Read candidate events here so preview can report image counts and cleanup has
    // the per-tree attachment ids without a second pass over the same logs.
    const readable: CandidateTree[] = []
    for (const tree of trees) {
      try {
        readable.push(await this.readCandidate(tree))
      } catch (error) {
        skipped.unreadable += 1
        this.log(`history cleanup skipped ${tree.root.sessionId}: ${messageOf(error)}`)
      }
    }
    const images = new Map<string, number>()
    let logBytes = 0
    for (const tree of readable) {
      logBytes += tree.logBytes
      for (const [id, bytes] of tree.images) images.set(id, bytes)
    }
    return { cutoff, trees: readable, images, logBytes, skipped, unreadable: skipped.unreadable }
  }

  /** Resolve one root plus its subagent descendants, skipping anything protected. */
  private async candidateTree(
    root: HistorySessionRow,
    children: ReadonlyMap<string, ReadonlySet<string>>,
    rowById: ReadonlyMap<string, HistorySessionRow>,
    snapshotById: ReadonlyMap<string, HistorySessionSnapshot>,
    pinned: ReadonlySet<string>,
    archived: ReadonlySet<string>,
    cutoff: number,
    skipped: HistorySkipCounts,
  ): Promise<CandidateTree | undefined> {
    const members: HistorySessionRow[] = []
    const sessions = new Map<string, HistorySessionSnapshot>()
    const pending = [root.sessionId]
    const seen = new Set<string>()
    let newest = 0
    let oldest = Number.POSITIVE_INFINITY
    while (pending.length > 0) {
      const id = pending.pop()
      if (id === undefined || seen.has(id)) continue
      seen.add(id)
      const row = rowById.get(id)
      if (row === undefined) {
        skipped.unchanged += 1
        return undefined
      }
      if (pinned.has(id)) { skipped.pinned += 1; return undefined }
      if (archived.has(id)) { skipped.archived += 1; return undefined }
      if (this.deps.currentSession() === id) { skipped.current += 1; return undefined }
      if (row.running === true || this.deps.isAttached(id)) { skipped.active += 1; return undefined }
      if (row.updatedAt === undefined || !Number.isFinite(row.updatedAt) || row.updatedAt <= 0) {
        skipped.unchanged += 1
        return undefined
      }
      if (row.updatedAt >= cutoff) { skipped.unchanged += 1; return undefined }
      const snapshot = snapshotById.get(id)
      if (snapshot === undefined) { skipped.unchanged += 1; return undefined }
      members.push(row)
      sessions.set(id, snapshot)
      newest = Math.max(newest, row.updatedAt)
      oldest = Math.min(oldest, row.updatedAt)
      for (const child of children.get(id) ?? []) pending.push(child)
    }
    const dirs = new Map<string, string>()
    for (const member of members) {
      const dir = await this.sessionDirectory(member.sessionId, sessions.get(member.sessionId))
      if (dir === undefined) { skipped.unreadable += 1; return undefined }
      dirs.set(member.sessionId, dir)
    }
    return { root, members, sessions, dirs, images: new Map(), logBytes: 0, newest, oldest }
  }

  /** Read one candidate tree's events, image ids, and physical log bytes. */
  private async readCandidate(tree: CandidateTree): Promise<CandidateTree> {
    const persistence = this.persistenceOrThrow()
    const images = new Map<string, number>()
    let logBytes = 0
    for (const member of tree.members) {
      const snapshot = tree.sessions.get(member.sessionId)
      if (snapshot === undefined) throw new Error(`session ${member.sessionId} disappeared`)
      const statted = await persistence.stat(member.sessionId, { signal: AbortSignal.timeout(15_000) })
      logBytes += statted?.sizeBytes ?? snapshot.sizeBytes ?? 0
      const handle = await persistence.open(member.sessionId, 'read')
      try {
        const read = await handle.read()
        for (const id of structuredImageIds(read.events ?? [])) {
          if (images.has(id)) continue
          images.set(id, await this.objectSize(id))
        }
      } finally {
        await handle.close().catch(() => undefined)
      }
    }
    return { ...tree, images, logBytes }
  }

  private async clean(): Promise<void> {
    const days = this.deps.store.history().retentionDays
    if (days <= 0) return
    this.assertAvailable()
    this.phase = 'planning'
    const plan = await this.plan(days)
    if (plan.trees.length === 0) {
      this.phase = ''
      return
    }
    const persistence = this.persistenceOrThrow()
    // A live-reference read failure must stop the run before anything is archived or moved.
    const live = await this.liveReferences(persistence, new Set(plan.trees.flatMap((tree) => tree.members.map((member) => member.sessionId))))
    const allSessions = plan.trees.flatMap((tree) => tree.members.map((member) => {
      const snapshot = tree.sessions.get(member.sessionId) as HistorySessionSnapshot
      return {
        id: member.sessionId,
        ...member.parentSessionId === undefined ? {} : { parentSessionId: member.parentSessionId },
        ...member.origin === undefined ? {} : { origin: member.origin },
        dir: tree.dirs.get(member.sessionId) as string,
        bytes: snapshot.sizeBytes ?? 0,
      }
    }))
    const batchId = batchName(this.now())
    const batchDir = join(this.deps.trashRoot, batchId)
    // Written before the first archive: a crash between archive and move leaves a
    // manifest that lets the next start put the session back.
    const planned: HistoryTrashBatch = {
      version: 1,
      batchId,
      createdAt: this.now(),
      status: 'planned',
      workspace: resolve(this.deps.workspacePath()),
      retentionDays: days,
      sessions: allSessions,
      images: [...plan.images].map(([id, bytes]) => ({ id, bytes })),
      archived: allSessions.map((session) => session.id),
    }
    await this.writeManifest(batchDir, planned)
    const failedTrees = new Set<string>()
    this.phase = 'archiving'
    for (const tree of plan.trees) {
      if (!await this.archiveTree(tree)) failedTrees.add(tree.root.sessionId)
    }
    const trees = plan.trees.filter((tree) => !failedTrees.has(tree.root.sessionId))
    if (trees.length === 0) {
      await rm(batchDir, { recursive: true, force: true }).catch(() => undefined)
      this.phase = ''
      return
    }
    // A failed tree still owns its images: protect them before the shared-image filter.
    for (const tree of plan.trees) {
      if (!failedTrees.has(tree.root.sessionId)) continue
      for (const id of tree.images.keys()) live.add(id)
    }
    const sessions = trees.flatMap((tree) => tree.members.map((member) => {
      const snapshot = tree.sessions.get(member.sessionId) as HistorySessionSnapshot
      return {
        id: member.sessionId,
        ...member.parentSessionId === undefined ? {} : { parentSessionId: member.parentSessionId },
        ...member.origin === undefined ? {} : { origin: member.origin },
        dir: tree.dirs.get(member.sessionId) as string,
        bytes: snapshot.sizeBytes ?? 0,
      }
    }))
    const images = new Map<string, number>()
    for (const tree of trees) {
      for (const [id, bytes] of tree.images) {
        if (!live.has(id)) images.set(id, bytes)
      }
    }
    const moving: HistoryTrashBatch = {
      ...planned,
      status: 'moving',
      sessions,
      images: [...images].map(([id, bytes]) => ({ id, bytes })),
      archived: sessions.map((session) => session.id),
    }
    this.phase = 'moving'
    try {
      await this.writeManifest(batchDir, moving)
      await this.executeBatch(batchDir, moving, sessions, images)
    } catch (error) {
      await this.rollbackBatch(batchDir, moving)
      throw error
    }
    const movedBytes = sessions.reduce((sum, session) => sum + session.bytes, 0)
      + [...images.values()].reduce((sum, bytes) => sum + bytes, 0)
    this.deps.store.setHistoryRecord({
      lastCleanupAt: this.now(),
      lastDeletedSessions: sessions.length,
      lastMovedBytes: movedBytes,
    })
    this.error = null
    this.phase = ''
  }

  /** Collect every image id still referenced by a session that stays. */
  private async liveReferences(persistence: HistoryPersistence, deleting: ReadonlySet<string>): Promise<Set<string>> {
    const refs = new Set<string>()
    for (const snapshot of await persistence.list({ signal: AbortSignal.timeout(30_000) })) {
      if (deleting.has(snapshot.header.id)) continue
      try {
        const handle = await persistence.open(snapshot.header.id, 'read')
        try {
          const read = await handle.read()
          for (const id of referencedImageIds(read.events ?? [])) refs.add(id)
        } finally {
          await handle.close().catch(() => undefined)
        }
      } catch (error) {
        throw new Error(`could not read remaining session ${snapshot.header.id}: ${messageOf(error)}`)
      }
    }
    return refs
  }

  private async archiveTree(tree: CandidateTree): Promise<boolean> {
    const archived: string[] = []
    try {
      for (const member of tree.members) {
        await this.deps.archive(member.sessionId)
        archived.push(member.sessionId)
      }
      return true
    } catch (error) {
      this.log(`history cleanup skipped ${tree.root.sessionId}: ${messageOf(error)}`)
      for (const id of archived.reverse()) await this.deps.unarchive(id).catch(() => undefined)
      return false
    }
  }

  /** Move one manifest's sessions and images, then mark it complete. */
  private async executeBatch(
    batchDir: string,
    manifest: HistoryTrashBatch,
    sessions: readonly HistoryTrashSession[],
    images: ReadonlyMap<string, number>,
  ): Promise<void> {
    await mkdir(join(batchDir, 'sessions'), { recursive: true })
    await mkdir(join(batchDir, 'objects'), { recursive: true })
    const moving = { ...manifest, status: 'moving' as const }
    await this.writeManifest(batchDir, moving)
    for (const session of sessions) {
      await movePath(session.dir, join(batchDir, 'sessions', session.id))
    }
    for (const id of images.keys()) {
      const source = this.objectPath(id)
      if (!existsSync(source)) continue
      await movePath(source, join(batchDir, 'objects', objectRelative(id)))
    }
    await this.writeManifest(batchDir, { ...moving, status: 'complete' })
  }

  /** Put everything a failed batch moved back and unarchive its sessions. */
  private async rollbackBatch(batchDir: string, manifest: HistoryTrashBatch): Promise<void> {
    for (const session of manifest.sessions) {
      const from = join(batchDir, 'sessions', session.id)
      if (!existsSync(from)) continue
      await movePath(from, session.dir).catch((error: unknown) => this.log(`history rollback could not restore ${session.id}: ${messageOf(error)}`))
    }
    for (const image of manifest.images) {
      const from = join(batchDir, 'objects', objectRelative(image.id))
      if (!existsSync(from)) continue
      await movePath(from, this.objectPath(image.id)).catch((error: unknown) => this.log(`history rollback could not restore ${image.id}: ${messageOf(error)}`))
    }
    for (const id of manifest.archived) await this.deps.unarchive(id).catch(() => undefined)
    await rm(batchDir, { recursive: true, force: true }).catch(() => undefined)
  }

  /** Move one batch back and unarchive its sessions; keep the batch when a session is missing. */
  private async restoreBatch(batchDir: string, manifest: HistoryTrashBatch): Promise<void> {
    let complete = true
    for (const session of manifest.sessions) {
      if (!isSessionId(session.id) || !isUnder(this.deps.sessionsRoot, session.dir)) {
        this.log(`history restore skipped an unsafe session entry ${String(session.id)}`)
        complete = false
        continue
      }
      const from = join(batchDir, 'sessions', session.id)
      if (!existsSync(from)) {
        if (!existsSync(session.dir)) complete = false
        continue
      }
      if (existsSync(session.dir)) continue
      try {
        await mkdir(dirname(session.dir), { recursive: true })
        await movePath(from, session.dir)
      } catch (error) {
        this.log(`history restore could not move ${session.id}: ${messageOf(error)}`)
        complete = false
      }
    }
    for (const image of manifest.images) {
      if (!isImageId(image.id)) {
        this.log(`history restore skipped an unsafe image entry ${String(image.id)}`)
        continue
      }
      const from = join(batchDir, 'objects', objectRelative(image.id))
      if (!existsSync(from)) continue
      const target = this.objectPath(image.id)
      if (existsSync(target)) continue
      try {
        await mkdir(dirname(target), { recursive: true })
        await movePath(from, target)
      } catch (error) {
        this.log(`history restore could not move ${image.id}: ${messageOf(error)}`)
        complete = false
      }
    }
    if (!complete) {
      this.log(`history restore for ${manifest.batchId} is incomplete; the batch and archive stay`)
      throw new Error('trash-incomplete')
    }
    for (const id of manifest.archived) await this.deps.unarchive(id).catch((error: unknown) => this.log(`history restore could not unarchive ${id}: ${messageOf(error)}`))
    await rm(batchDir, { recursive: true, force: true })
  }

  /** Startup repair plus expiry: incomplete batches are restored, old complete ones freed. */
  private async recoverAndPurge(): Promise<void> {
    if (this.cleaning) return
    this.cleaning = true
    this.phase = 'recovering'
    try {
      for (const dir of this.readBatchDirs()) {
        const manifest = this.readManifest(dir)
        if (manifest === undefined) {
          this.log(`history trash ${dir} has no readable manifest; left untouched`)
          continue
        }
        if (manifest.status !== 'complete') {
          try {
            await this.restoreBatch(dir, manifest)
          } catch (error) {
            this.log(`history trash ${dir} could not be recovered: ${messageOf(error)}`)
          }
          continue
        }
        if (this.now() - manifest.createdAt > TRASH_RETENTION_MS) await rm(dir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 })
      }
    } catch (error) {
      this.log(`history trash recovery failed: ${messageOf(error)}`)
    } finally {
      this.cleaning = false
      this.phase = ''
    }
  }

  private async sessionDirectory(id: string, snapshot: HistorySessionSnapshot | undefined): Promise<string | undefined> {
    const persistence = this.persistenceOrThrow()
    const header = snapshot?.header ?? (await persistence.stat(id, { signal: AbortSignal.timeout(15_000) }))?.header
    if (header === undefined) return undefined
    const located = persistence.locate?.(header)
    if (typeof located?.path === 'string' && located.path !== '') {
      const dir = dirname(located.path)
      return isUnder(this.deps.sessionsRoot, dir) ? dir : undefined
    }
    try {
      for (const project of await readdir(this.deps.sessionsRoot, { withFileTypes: true })) {
        if (!project.isDirectory()) continue
        const candidate = join(this.deps.sessionsRoot, project.name, id)
        if (!isUnder(this.deps.sessionsRoot, candidate)) continue
        try {
          if (statSync(candidate).isDirectory()) return candidate
        } catch {
          // Try the next project directory.
        }
      }
    } catch {
      return undefined
    }
    return undefined
  }

  private objectPath(id: string): string {
    const hex = id.startsWith('sha256:') ? id.slice('sha256:'.length) : id
    return join(this.deps.objectsRoot, hex.slice(0, 2), hex)
  }

  private async objectSize(id: string): Promise<number> {
    try {
      return (await stat(this.objectPath(id))).size
    } catch {
      return 0
    }
  }

  private persistenceOrThrow(): HistoryPersistence {
    const persistence = this.deps.persistence()
    if (persistence === undefined) throw new HistoryUnavailableError('history-unavailable')
    return persistence
  }

  private readBatchDirs(): string[] {
    try {
      return readdirSync(this.deps.trashRoot, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => join(this.deps.trashRoot, entry.name))
    } catch {
      return []
    }
  }

  private readBatches(): HistoryTrashSummary[] {
    const batches: HistoryTrashSummary[] = []
    for (const dir of this.readBatchDirs()) {
      const manifest = this.readManifest(dir)
      if (manifest === undefined) continue
      batches.push({
        id: manifest.batchId,
        createdAt: manifest.createdAt,
        status: manifest.status,
        sessions: manifest.sessions.length,
        images: manifest.images.length,
        bytes: manifest.sessions.reduce((sum, session) => sum + session.bytes, 0)
          + manifest.images.reduce((sum, image) => sum + image.bytes, 0),
      })
    }
    return batches.sort((left, right) => right.createdAt - left.createdAt)
  }

  private readManifest(batchDir: string): HistoryTrashBatch | undefined {
    try {
      const parsed = JSON.parse(readFileSync(join(batchDir, 'manifest.json'), 'utf8')) as Partial<HistoryTrashBatch>
      if (parsed.version !== 1 || typeof parsed.batchId !== 'string' || !Array.isArray(parsed.sessions) || !Array.isArray(parsed.images)) return undefined
      if (parsed.status !== 'planned' && parsed.status !== 'moving' && parsed.status !== 'complete') return undefined
      return parsed as HistoryTrashBatch
    } catch {
      return undefined
    }
  }

  private async writeManifest(batchDir: string, manifest: HistoryTrashBatch): Promise<void> {
    await mkdir(batchDir, { recursive: true, mode: 0o700 })
    const file = join(batchDir, 'manifest.json')
    const staged = `${file}.tmp`
    await writeFile(staged, `${JSON.stringify(manifest, null, 2)}\n`, { mode: 0o600 })
    await rename(staged, file)
  }

  private now(): number {
    return this.deps.now?.() ?? Date.now()
  }

  private log(message: string): void {
    (this.deps.log ?? ((line: string) => console.error(`dsh-orb: ${line}`)))(message)
  }
}

/** Roots the ball's history shows: the workspace itself, an ordinary preset, not a subagent. */
export function isOrbRoot(row: HistorySessionRow, workspace: string): boolean {
  if (row.origin === 'subagent') return false
  if (typeof row.cwd !== 'string' || resolve(row.cwd) !== resolve(workspace)) return false
  const preset = row.projections?.values?.agentPreset
  return preset === undefined || preset === 'computer-use'
}

/** Image ids carried by structured ImageBlocks in persisted events. */
export function structuredImageIds(events: readonly unknown[]): Set<string> {
  const ids = new Set<string>()
  visit(events, (value) => {
    if (typeof value.attachmentId !== 'string' || !isImageId(value.attachmentId)) return
    ids.add(value.attachmentId)
  })
  return ids
}

/**
 * All `sha256:` ids in a session, including text placeholders left by image offload.
 * Used for remaining sessions so a conservative read never misses an id.
 */
export function referencedImageIds(events: readonly unknown[]): Set<string> {
  const ids = new Set<string>()
  const text = JSON.stringify(events)
  for (const match of text.matchAll(SHA256_REF)) ids.add(match[0])
  return ids
}

function visit(value: unknown, onRecord: (value: Record<string, unknown>) => void): void {
  if (Array.isArray(value)) {
    for (const item of value) visit(item, onRecord)
    return
  }
  if (typeof value !== 'object' || value === null) return
  const record = value as Record<string, unknown>
  onRecord(record)
  for (const item of Object.values(record)) visit(item, onRecord)
}

function emptySkips(): HistorySkipCounts {
  return { active: 0, pinned: 0, archived: 0, current: 0, unchanged: 0, unreadable: 0 }
}

function batchName(now: number): string {
  return `${new Date(now).toISOString().replaceAll(':', '-').replaceAll('.', '-')}-${randomBytes(3).toString('hex')}`
}

function isImageId(id: string): boolean {
  return /^sha256:[0-9a-f]{64}$/.test(id)
}

function isSessionId(id: string): boolean {
  return /^[A-Za-z0-9._-]+$/.test(id) && !id.includes('..')
}

function isBatchId(id: string): boolean {
  return /^[A-Za-z0-9._-]+$/.test(id) && !id.includes('..')
}

function objectRelative(id: string): string {
  const hex = id.startsWith('sha256:') ? id.slice('sha256:'.length) : id
  return join(hex.slice(0, 2), hex)
}

function isUnder(root: string, path: string): boolean {
  const rel = relative(resolve(root), resolve(path))
  return rel !== '' && !rel.startsWith('..') && !isAbsolute(rel)
}

async function movePath(from: string, to: string): Promise<void> {
  await mkdir(dirname(to), { recursive: true })
  let last: unknown
  for (let attempt = 0; attempt < MOVE_ATTEMPTS; attempt += 1) {
    try {
      await rename(from, to)
      return
    } catch (error) {
      last = error
      const code = (error as { code?: unknown }).code
      if (code !== 'EXDEV') {
        if (code !== 'EPERM' && code !== 'EBUSY' && code !== 'EACCES') throw error
        await new Promise((resolve) => setTimeout(resolve, MOVE_BACKOFF_MS))
        continue
      }
      await cp(from, to, { recursive: true, errorOnExist: true, force: false })
      await rm(from, { recursive: true, force: true })
      return
    }
  }
  throw last
}

function messageOf(error: unknown): string {
  return error instanceof Error && error.message !== '' ? error.message : String(error)
}

/** Where the trash lives by default; exported so the host wiring and tests agree. */
export function historyTrashRoot(): string {
  return join(dshHomePath('dsh-orb'), 'history-trash')
}

export { HistoryUnavailableError }
