import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, utimesSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, describe, it, mock } from 'node:test'
import assert from 'node:assert/strict'
import {
  cancelRuntimeDownload,
  expectedHash,
  isLockTaken,
  isResumeRefused,
  isRuntimeDownloadCancelled,
  lockExpired,
  PINNED_SHA256,
  purgeRuntimeArtifacts,
  withDownloadLock,
  zipCurlArgs,
} from '../src/electron-runtime.ts'

const fileName = 'electron-v44.0.0-darwin-arm64.zip'

const root = mkdtempSync(join(tmpdir(), 'orb-download-lock-'))
after(() => { rmSync(root, { recursive: true, force: true }) })

const lockName = 'electron-runtime.download.lock'

let counter = 0
function parent(): string {
  counter += 1
  const dir = join(root, `parent-${counter}`)
  mkdirSync(dir, { recursive: true })
  return dir
}

/** A pid that is certainly gone: spawnSync waited for it to exit. */
function deadPid(): number {
  const child = spawnSync(process.execPath, ['-e', ''], { stdio: 'ignore' })
  assert.equal(child.status, 0)
  return child.pid
}

function staleLock(dir: string, owner: string | undefined, ageMs = 0): string {
  const lock = join(dir, lockName)
  mkdirSync(lock, { recursive: true })
  if (owner !== undefined) writeFileSync(join(lock, 'owner'), owner)
  if (ageMs > 0) {
    const past = new Date(Date.now() - ageMs)
    utimesSync(lock, past, past)
  }
  return lock
}

describe('Electron checksum pin', () => {
  it('accepts a checksum list that matches the pinned hash', () => {
    const pinned = PINNED_SHA256[fileName]
    assert.equal(expectedHash(`${pinned} *${fileName}\n`, fileName), pinned)
  })

  it('rejects a checksum list that disagrees with the pin', () => {
    const other = 'a'.repeat(64)
    assert.throws(
      () => expectedHash(`${other} *${fileName}\n`, fileName),
      /does not match the pinned hash/,
    )
  })

  it('rejects a file that was never pinned', () => {
    assert.throws(
      () => expectedHash(`${'b'.repeat(64)} *electron-v44.0.0-freebsd-x64.zip\n`, 'electron-v44.0.0-freebsd-x64.zip'),
      /no pinned Electron/,
    )
  })
})

describe('Electron download lock', () => {
  it('appears with its owner already inside and is released after the task', async () => {
    const dir = parent()
    const lock = join(dir, lockName)
    await withDownloadLock(dir, async () => {
      const owner = readFileSync(join(lock, 'owner'), 'utf8')
      assert.equal(Number(owner.split('\n')[0]), process.pid)
    })
    assert.equal(existsSync(lock), false)
  })

  it('never runs two acquisitions at once', async () => {
    const dir = parent()
    const order: string[] = []
    let concurrent = 0
    let peak = 0
    let release = () => {}
    const gate = new Promise<void>((resolve) => { release = resolve })
    const first = withDownloadLock(dir, async () => {
      concurrent += 1
      peak = Math.max(peak, concurrent)
      order.push('first')
      await gate
      concurrent -= 1
    })
    const second = withDownloadLock(dir, async () => {
      concurrent += 1
      peak = Math.max(peak, concurrent)
      order.push('second')
      concurrent -= 1
    })
    await new Promise((resolve) => setTimeout(resolve, 400))
    // Whoever renamed its staging directory first holds the lock; the other waits, and the
    // lock only ever appears with its owner inside, so neither can take the other's lock.
    assert.equal(peak, 1, 'the second waiter does not run beside the holder')
    release()
    await Promise.all([first, second])
    assert.deepEqual([...order].sort(), ['first', 'second'])
  })

  it('takes over a lock whose owner is gone, and keeps one whose owner lives', async () => {
    const dead = parent()
    staleLock(dead, `${deadPid()}\n${Date.now()}\n`)
    let ran = false
    await withDownloadLock(dead, async () => { ran = true })
    assert.equal(ran, true, 'a dead owner cannot hold the lock')

    const live = parent()
    assert.equal(await lockExpired(staleLock(live, `${process.pid}\n${Date.now()}\n`)), false)
  })

  it('collects an owner-less lock only once the directory is old', async () => {
    const fresh = parent()
    const freshLock = staleLock(fresh, undefined)
    assert.equal(await lockExpired(freshLock), false, 'a lock being made cannot be swept')

    const old = parent()
    const oldLock = staleLock(old, undefined, 40_000)
    assert.equal(await lockExpired(oldLock), true)
  })

  it('treats EPERM from the liveness probe as a live owner', async () => {
    const dir = parent()
    const lock = staleLock(dir, `${process.pid}\n${Date.now()}\n`)
    const denied = Object.assign(new Error('denied'), { code: 'EPERM' })
    const probe = mock.method(process, 'kill', () => { throw denied })
    try {
      assert.equal(await lockExpired(lock), false)
    } finally {
      probe.mock.restore()
    }
  })

  it('treats a lock that is not there as absent, not as expired', async () => {
    // `true` here would send `withDownloadLock` straight back around the loop with no backoff,
    // which is an unbounded spin whenever a rename is refused for a reason other than the lock.
    assert.equal(await lockExpired(join(parent(), lockName)), false)
    // A directory that vanished between reading its owner and stating it is the same answer.
    const dir = parent()
    const lock = staleLock(dir, undefined)
    rmSync(lock, { recursive: true, force: true })
    assert.equal(await lockExpired(lock), false)
  })

  it('reads every rename refusal as a held lock, and a real failure as an error', () => {
    // Windows refuses a directory-over-directory rename with EPERM or EACCES rather than
    // the POSIX EEXIST/ENOTEMPTY; all four mean someone else holds the lock.
    for (const code of ['EEXIST', 'ENOTEMPTY', 'EPERM', 'EACCES']) {
      assert.equal(isLockTaken(Object.assign(new Error('taken'), { code })), true, code)
    }
    for (const code of ['ENOSPC', 'EISDIR', 'ENOENT']) {
      assert.equal(isLockTaken(Object.assign(new Error('real failure'), { code })), false, code)
    }
    assert.equal(isLockTaken(new Error('no code')), false)
    assert.equal(isLockTaken(undefined), false)
  })
})

describe('manual runtime redownload', () => {
  it('stops waiting for a lock the moment the user restarts the download', async () => {
    const dir = parent()
    const held = staleLock(dir, `${process.pid}\n${Date.now()}\n`)
    const controller = new AbortController()
    controller.abort()
    await assert.rejects(
      withDownloadLock(dir, async () => {}, controller.signal),
      (error: unknown) => isRuntimeDownloadCancelled(error),
      'an aborted attempt must not sit out the ten-minute lock deadline',
    )
    assert.equal(existsSync(held), true, 'the lock belongs to another process and stays')
  })

  it('clears what an interrupted attempt left behind, but keeps the bytes a retry resumes', async () => {
    const home = join(root, 'home-purge')
    const orb = join(home, 'dsh-orb')
    mkdirSync(join(orb, 'electron-runtime'), { recursive: true })
    writeFileSync(join(orb, '.electron-abc123.zip'), 'a zip from the old naming')
    mkdirSync(join(orb, '.electron-staging-def456'), { recursive: true })
    writeFileSync(join(orb, '.electron-staging-def456', 'half an extraction'), 'x')
    writeFileSync(join(orb, '.electron-electron-v44.0.0-darwin-arm64.zip.partial'), '93 MB of the real one')
    writeFileSync(join(orb, 'electron-runtime', '.complete-44.0.0'), '44.0.0\n')
    const previous = process.env.DSH_HOME
    process.env.DSH_HOME = home
    try {
      await purgeRuntimeArtifacts()
    } finally {
      if (previous === undefined) delete process.env.DSH_HOME
      else process.env.DSH_HOME = previous
    }
    assert.equal(existsSync(join(orb, '.electron-abc123.zip')), false, 'a leftover zip is gone')
    assert.equal(existsSync(join(orb, '.electron-staging-def456')), false, 'the half-extracted folder is gone')
    assert.equal(
      existsSync(join(orb, '.electron-electron-v44.0.0-darwin-arm64.zip.partial')),
      true,
      'the resumable partial of this platform stays: a redownload continues it',
    )
    assert.equal(existsSync(join(orb, 'electron-runtime', '.complete-44.0.0')), true, 'the finished runtime stays')
  })

  it('downloads without a total time limit, and resumes only when there are bytes to keep', () => {
    const fresh = zipCurlArgs('https://example.invalid/electron.zip', '/tmp/electron.zip', false)
    const resumed = zipCurlArgs('https://example.invalid/electron.zip', '/tmp/electron.zip', true)
    // A cap here is what made a 124–150 MB runtime impossible to finish below ~450 KB/s: the
    // transfer was cut off mid-flight and the next attempt paid for the same bytes again.
    assert.equal(fresh.some((arg) => arg === '--max-time'), false, 'no total time limit on the zip')
    assert.equal(fresh.some((arg) => arg.startsWith('--speed-limit')), true, 'the stall guard stays')
    assert.equal(fresh.includes('-C'), false, 'nothing to resume from on a fresh file')
    assert.equal(resumed[resumed.indexOf('-C') + 1], '-', 'a partial download continues from its end')
    assert.deepEqual(
      resumed.slice(-5),
      ['-C', '-', '-o', '/tmp/electron.zip', 'https://example.invalid/electron.zip'],
      'the resume flag sits with the output, and the mirror comes last',
    )
    // Everything else is identical: the resume is the only difference between the two calls.
    assert.deepEqual(resumed.filter((arg) => arg !== '-C' && arg !== '-'), fresh)
  })

  it('reads a refused resume out of curl, without mistaking a dead mirror for one', () => {
    assert.equal(isResumeRefused(Object.assign(new Error('curl exited 33'), { exitCode: 33 })), true)
    assert.equal(isResumeRefused(Object.assign(new Error('curl exited 36'), { exitCode: 36 })), true)
    assert.equal(
      isResumeRefused(Object.assign(new Error('curl exited 22: The requested URL returned error: 416'), { exitCode: 22 })),
      true,
      'a 416 arrives as the generic HTTP-failure exit and has to be read out of the message',
    )
    // A mirror that is down must not throw the downloaded bytes away: the next one resumes them.
    assert.equal(
      isResumeRefused(Object.assign(new Error('curl exited 22: The requested URL returned error: 404'), { exitCode: 22 })),
      false,
    )
    assert.equal(isResumeRefused(new Error('no exit code')), false)
  })

  it('marks only its own cancellation, never a real download failure', () => {
    // Nothing in flight is not an error: a redownload with no attempt running is the normal case.
    cancelRuntimeDownload()
    assert.equal(isRuntimeDownloadCancelled(new Error('dsh-orb: curl exited 22')), false)
    assert.equal(isRuntimeDownloadCancelled(undefined), false)
    assert.equal(
      isRuntimeDownloadCancelled(Object.assign(new Error('cancelled'), { code: 'dsh-orb-download-cancelled' })),
      true,
      'the host keys the "do not count this retry" branch on this tag',
    )
  })
})
