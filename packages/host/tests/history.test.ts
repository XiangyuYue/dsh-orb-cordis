import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { ProfileStore } from '../src/preferences.ts'
import {
  HistoryCleaner,
  type HistoryPersistence,
  type HistorySessionHeader,
  type HistorySessionRow,
  type HistorySessionSnapshot,
  type HistoryTrashBatch,
  type WorkspaceSafety,
} from '../src/history.ts'

const root = mkdtempSync(join(tmpdir(), 'orb-history-'))
after(() => { rmSync(root, { recursive: true, force: true }) })

const NOW = Date.parse('2026-10-18T00:00:00Z')
const DAY = 24 * 60 * 60 * 1000

interface FakeSession {
  readonly id: string
  readonly cwd: string
  readonly parent?: string
  readonly origin?: string
  readonly updatedAt: number
  readonly running?: boolean
  readonly preset?: string
  readonly events: readonly unknown[]
  readonly bytes: number
}

function imageId(index: number): string {
  return `sha256:${String(index.toString(16)).padStart(2, '0').repeat(32)}`
}

function imageEvent(id: string, bytes: number): unknown {
  return {
    type: 'user/message',
    data: {
      content: [{
        type: 'image',
        attachment: { attachmentId: id, mediaType: 'image/jpeg', bytes, width: 100, height: 100, name: 'desktop-screen-0' },
      }],
    },
  }
}

function fixture(): {
  cleaner: HistoryCleaner
  store: ProfileStore
  workspace: string
  sessionsRoot: string
  objectsRoot: string
  trashRoot: string
  sessions: FakeSession[]
  archived: Set<string>
  pinned: Set<string>
  attached: Set<string>
  archiveFails: Set<string>
  unarchived: string[]
  add: (session: Partial<FakeSession> & { id: string; updatedAt: number; cwd?: string; events?: readonly unknown[]; bytes?: number }) => FakeSession
  object: (id: string, bytes: number) => void
  setCurrent: (id: string | undefined) => void
  run: () => Promise<void>
} {
  const base = mkdtempSync(join(root, 'case-'))
  const profileDir = join(base, 'profile')
  const sessionsRoot = join(base, 'sessions')
  const objectsRoot = join(base, 'objects')
  const trashRoot = join(base, 'trash')
  mkdirSync(profileDir, { recursive: true })
  mkdirSync(sessionsRoot, { recursive: true })
  mkdirSync(objectsRoot, { recursive: true })
  const workspace = join(base, 'orb-workspace')
  mkdirSync(workspace, { recursive: true })
  const store = new ProfileStore(profileDir)
  const sessions: FakeSession[] = []
  const dirs = new Map<string, string>()
  const archived = new Set<string>()
  const pinned = new Set<string>()
  const attached = new Set<string>()
  const archiveFails = new Set<string>()
  const unarchived: string[] = []

  const add = (session: Partial<FakeSession> & { id: string; updatedAt: number; cwd?: string; events?: readonly unknown[]; bytes?: number }): FakeSession => {
    const record: FakeSession = {
      id: session.id,
      cwd: session.cwd ?? workspace,
      ...session.parent === undefined ? {} : { parent: session.parent },
      ...session.origin === undefined ? {} : { origin: session.origin },
      updatedAt: session.updatedAt,
      ...session.running === undefined ? {} : { running: session.running },
      ...session.preset === undefined ? {} : { preset: session.preset },
      events: session.events ?? [],
      bytes: session.bytes ?? 1000,
    }
    sessions.push(record)
    const dir = join(sessionsRoot, `proj-${String(sessions.length)}`, record.id)
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, 'session.v4.jsonl.zstd'), 'x')
    dirs.set(record.id, dir)
    return record
  }

  const object = (id: string, bytes: number): void => {
    const hex = id.slice('sha256:'.length)
    const dir = join(objectsRoot, hex.slice(0, 2))
    mkdirSync(dir, { recursive: true })
    writeFileSync(join(dir, hex), Buffer.alloc(bytes))
  }

  const header = (session: FakeSession): HistorySessionHeader => ({
    id: session.id,
    cwd: session.cwd,
    ...session.parent === undefined ? {} : { parentSession: session.parent },
    ...session.origin === undefined ? {} : { origin: session.origin },
    createdAt: session.updatedAt,
  })
  const snapshot = (session: FakeSession): HistorySessionSnapshot => ({ header: header(session), sizeBytes: session.bytes })

  const persistence: HistoryPersistence = {
    async list() { return sessions.map(snapshot) },
    async stat(id) {
      const found = sessions.find((session) => session.id === id)
      return found === undefined ? undefined : snapshot(found)
    },
    async open(id) {
      const found = sessions.find((session) => session.id === id)
      if (found === undefined) throw new Error(`missing session ${id}`)
      return {
        async read() { return { events: found.events } },
        async close() {},
      }
    },
    locate(value) {
      const dir = dirs.get(value.id)
      return dir === undefined ? undefined : { path: join(dir, 'session.v4.jsonl.zstd') }
    },
  }

  let current: string | undefined
  const rows = (): HistorySessionRow[] => sessions.map((session) => ({
    sessionId: session.id,
    updatedAt: session.updatedAt,
    ...session.running === undefined ? {} : { running: session.running },
    ...session.parent === undefined ? {} : { parentSessionId: session.parent },
    ...session.origin === undefined ? {} : { origin: session.origin },
    cwd: session.cwd,
    projections: { values: { agentPreset: session.preset ?? 'computer-use' } },
  }))

  const cleaner = new HistoryCleaner({
    store,
    workspacePath: () => workspace,
    currentSession: () => current,
    listSessions: async () => rows(),
    isAttached: (id) => attached.has(id),
    workspaceSafety: async (): Promise<WorkspaceSafety> => ({ pinned: [...pinned], archived: [...archived] }),
    async archive(id) {
      if (archiveFails.has(id)) throw new Error('workspace/session-active')
      archived.add(id)
    },
    async unarchive(id) {
      archived.delete(id)
      unarchived.push(id)
    },
    persistence: () => persistence,
    available: () => true,
    sessionsRoot,
    objectsRoot,
    trashRoot,
    now: () => NOW,
    log: () => {},
  })

  const run = async (): Promise<void> => {
    cleaner.startClean()
    for (let attempt = 0; attempt < 200; attempt += 1) {
      if (!cleaner.state().cleaning) return
      await new Promise((resolve) => setTimeout(resolve, 5))
    }
    throw new Error('cleanup did not finish')
  }

  return {
    cleaner,
    store,
    workspace,
    sessionsRoot,
    objectsRoot,
    trashRoot,
    sessions,
    archived,
    pinned,
    attached,
    archiveFails,
    unarchived,
    add,
    object,
    setCurrent: (id) => { current = id },
    run,
  }
}

describe('history retention', () => {
  it('defaults to forever and validates the retention range', () => {
    const { cleaner, store } = fixture()
    assert.equal(cleaner.state().retentionDays, 0)
    assert.equal(cleaner.state().lastCleanupAt, null)
    assert.throws(() => cleaner.setRetention(-1), /invalid-retention/)
    assert.throws(() => cleaner.setRetention(3651), /invalid-retention/)
    cleaner.setRetention(30)
    assert.equal(store.history().retentionDays, 30)
    assert.equal(cleaner.state().retentionDays, 30)
  })

  it('counts the last chat, not the creation time', async () => {
    const case_ = fixture()
    case_.add({ id: 'session-old-created', updatedAt: NOW - 200 * DAY })
    const active = case_.add({ id: 'session-active', updatedAt: NOW - 2 * DAY })
    const preview = await case_.cleaner.preview(30)
    assert.equal(preview.roots, 1)
    assert.equal(case_.sessions.find((session) => session.id === active.id)?.updatedAt, NOW - 2 * DAY)
    assert.ok(!preview.oldest || preview.oldest < NOW)
  })

  it('previews and cleans an old root with its subagent child', async () => {
    const case_ = fixture()
    const shot = imageId(1)
    case_.object(shot, 222)
    const rootSession = case_.add({ id: 'session-root', updatedAt: NOW - 40 * DAY, events: [imageEvent(shot, 222)] })
    const child = case_.add({ id: 'session-child', parent: rootSession.id, origin: 'subagent', updatedAt: NOW - 41 * DAY })
    case_.store.setHistoryRecord({ retentionDays: 30 })

    const preview = await case_.cleaner.preview(30)
    assert.equal(preview.roots, 1)
    assert.equal(preview.members, 2)
    assert.equal(preview.images, 1)
    assert.equal(preview.bytes, 222 + 1000 + 1000)

    await case_.run()
    assert.equal(existsSync(join(case_.sessionsRoot, 'proj-1', rootSession.id)), false)
    assert.equal(existsSync(join(case_.sessionsRoot, 'proj-2', child.id)), false)
    assert.equal(existsSync(join(case_.objectsRoot, shot.slice(7, 9), shot.slice(7))), false)
    const state = case_.cleaner.state()
    assert.equal(state.trashBatches.length, 1)
    assert.equal(state.lastDeletedSessions, 2)
    assert.ok(state.lastMovedBytes > 0)
    assert.deepEqual([...case_.archived].sort(), [child.id, rootSession.id].sort())

    await case_.cleaner.restore(state.trashBatches[0]?.id)
    assert.equal(existsSync(join(case_.sessionsRoot, 'proj-1', rootSession.id)), true)
    assert.equal(existsSync(join(case_.objectsRoot, shot.slice(7, 9), shot.slice(7))), true)
    assert.equal(case_.archived.size, 0)
    assert.equal(case_.cleaner.state().trashBatches.length, 0)
  })

  it('keeps a whole tree when one subagent is recent', async () => {
    const case_ = fixture()
    const rootSession = case_.add({ id: 'session-root', updatedAt: NOW - 40 * DAY })
    case_.add({ id: 'session-child', parent: rootSession.id, origin: 'subagent', updatedAt: NOW - 2 * DAY })
    case_.store.setHistoryRecord({ retentionDays: 30 })
    const preview = await case_.cleaner.preview(30)
    assert.equal(preview.roots, 0)
    assert.equal(preview.members, 0)
    await case_.run()
    assert.equal(existsSync(join(case_.sessionsRoot, 'proj-1', rootSession.id)), true)
    assert.equal(case_.cleaner.state().trashBatches.length, 0)
  })

  it('skips attached, running, pinned, archived, current, and other-workspace sessions', async () => {
    const case_ = fixture()
    case_.add({ id: 'session-running', updatedAt: NOW - 40 * DAY, running: true })
    const pinned = case_.add({ id: 'session-pinned', updatedAt: NOW - 40 * DAY })
    case_.pinned.add(pinned.id)
    const archived = case_.add({ id: 'session-archived', updatedAt: NOW - 40 * DAY })
    case_.archived.add(archived.id)
    const attached = case_.add({ id: 'session-attached', updatedAt: NOW - 40 * DAY })
    case_.attached.add(attached.id)
    const current = case_.add({ id: 'session-current', updatedAt: NOW - 40 * DAY })
    case_.setCurrent(current.id)
    case_.add({ id: 'session-elsewhere', cwd: join(case_.workspace, '..', 'other'), updatedAt: NOW - 40 * DAY })
    case_.store.setHistoryRecord({ retentionDays: 30 })
    const preview = await case_.cleaner.preview(30)
    assert.equal(preview.roots, 0)
    assert.equal(preview.skipped.active, 2)
    assert.equal(preview.skipped.pinned, 1)
    assert.equal(preview.skipped.archived, 1)
    assert.equal(preview.skipped.current, 1)
  })

  it('moves only images no remaining conversation references', async () => {
    const case_ = fixture()
    const shared = imageId(1)
    const exclusive = imageId(2)
    case_.object(shared, 111)
    case_.object(exclusive, 222)
    case_.add({ id: 'session-old', updatedAt: NOW - 40 * DAY, events: [imageEvent(shared, 111), imageEvent(exclusive, 222)] })
    case_.add({ id: 'session-kept', updatedAt: NOW - 1 * DAY, events: [imageEvent(shared, 111)] })
    case_.store.setHistoryRecord({ retentionDays: 30 })
    await case_.run()
    assert.equal(existsSync(join(case_.objectsRoot, shared.slice(7, 9), shared.slice(7))), true)
    assert.equal(existsSync(join(case_.objectsRoot, exclusive.slice(7, 9), exclusive.slice(7))), false)
  })

  it('keeps a tree in place when archiving is refused, and unarchives a partial tree', async () => {
    const case_ = fixture()
    const refused = case_.add({ id: 'session-refused', updatedAt: NOW - 40 * DAY })
    case_.archiveFails.add(refused.id)
    case_.store.setHistoryRecord({ retentionDays: 30 })
    await case_.run()
    assert.equal(existsSync(join(case_.sessionsRoot, 'proj-1', refused.id)), true)
    assert.equal(case_.cleaner.state().trashBatches.length, 0)

    const second = fixture()
    const parent = second.add({ id: 'session-parent', updatedAt: NOW - 40 * DAY })
    const child = second.add({ id: 'session-child', parent: parent.id, origin: 'subagent', updatedAt: NOW - 41 * DAY })
    second.archiveFails.add(child.id)
    second.store.setHistoryRecord({ retentionDays: 30 })
    await second.run()
    assert.equal(existsSync(join(second.sessionsRoot, 'proj-1', parent.id)), true)
    assert.equal(second.archived.size, 0)
    assert.deepEqual(second.unarchived, [parent.id])
    assert.equal(second.cleaner.state().trashBatches.length, 0)
  })

  it('restores an interrupted batch on startup', async () => {
    const case_ = fixture()
    const session = case_.add({ id: 'session-interrupted', updatedAt: NOW - 40 * DAY })
    const batchId = '2026-10-01T00-00-00-000Z-test'
    const batchDir = join(case_.trashRoot, batchId)
    const original = join(case_.sessionsRoot, 'proj-1', session.id)
    mkdirSync(join(batchDir, 'sessions'), { recursive: true })
    mkdirSync(join(batchDir, 'objects'), { recursive: true })
    mkdirSync(join(batchDir, 'sessions', session.id), { recursive: true })
    writeFileSync(join(batchDir, 'sessions', session.id, 'session.v4.jsonl.zstd'), 'x')
    rmSync(original, { recursive: true, force: true })
    case_.archived.add(session.id)
    const manifest: HistoryTrashBatch = {
      version: 1,
      batchId,
      createdAt: NOW - DAY,
      status: 'moving',
      workspace: case_.workspace,
      retentionDays: 30,
      sessions: [{ id: session.id, dir: original, bytes: 1000 }],
      images: [],
      archived: [session.id],
    }
    writeFileSync(join(batchDir, 'manifest.json'), `${JSON.stringify(manifest)}\n`)
    await case_.cleaner.recover()
    assert.equal(existsSync(original), true)
    assert.equal(case_.archived.has(session.id), false)
    assert.equal(existsSync(batchDir), false)
  })

  it('purges a complete batch older than seven days and keeps a young one', async () => {
    const case_ = fixture()
    const make = (batchId: string, createdAt: number): void => {
      const dir = join(case_.trashRoot, batchId)
      mkdirSync(dir, { recursive: true })
      writeFileSync(join(dir, 'manifest.json'), `${JSON.stringify({
        version: 1, batchId, createdAt, status: 'complete', workspace: case_.workspace,
        retentionDays: 30, sessions: [], images: [], archived: [],
      } satisfies HistoryTrashBatch)}\n`)
    }
    make('old', NOW - 8 * DAY)
    make('young', NOW - 2 * DAY)
    await case_.cleaner.recover()
    assert.equal(existsSync(join(case_.trashRoot, 'old')), false)
    assert.equal(existsSync(join(case_.trashRoot, 'young')), true)
  })

  it('moves a trash batch and a session directory back on restore', async () => {
    const case_ = fixture()
    const session = case_.add({ id: 'session-restore', updatedAt: NOW - 40 * DAY })
    case_.store.setHistoryRecord({ retentionDays: 30 })
    await case_.run()
    const batch = case_.cleaner.state().trashBatches[0]
    assert.ok(batch)
    await case_.cleaner.restore(batch.id)
    assert.equal(existsSync(join(case_.sessionsRoot, 'proj-1', session.id)), true)
    assert.equal(case_.archived.size, 0)
  })

  it('leaves a session directory untouched when cleanup is off', async () => {
    const case_ = fixture()
    const session = case_.add({ id: 'session-forever', updatedAt: NOW - 400 * DAY })
    await case_.run()
    assert.equal(existsSync(join(case_.sessionsRoot, 'proj-1', session.id)), true)
    assert.equal(case_.cleaner.state().trashBatches.length, 0)
  })
})
