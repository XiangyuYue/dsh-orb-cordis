import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { validateWorkspaceSelection } from '../src/workspace.ts'

const root = mkdtempSync(join(tmpdir(), 'orb-workspace-validation-'))
after(() => { rmSync(root, { recursive: true, force: true }) })

describe('workspace selection', () => {
  it('accepts the default even when it already has sessions', async () => {
    const fallback = join(root, 'default')
    mkdirSync(fallback, { recursive: true })
    writeFileSync(join(fallback, 'session.jsonl.zstd'), 'x')
    const choice = await validateWorkspaceSelection(fallback, fallback, join(root, 'other'))
    assert.deepEqual(choice, { path: fallback, custom: false, unchanged: false })
  })

  it('accepts an existing empty custom directory', async () => {
    const fallback = join(root, 'default')
    const custom = join(root, 'empty')
    mkdirSync(custom, { recursive: true })
    const choice = await validateWorkspaceSelection(custom, fallback, fallback)
    assert.equal(choice.path, custom)
    assert.equal(choice.custom, true)
    assert.equal(choice.unchanged, false)
  })

  it('rejects a non-empty custom directory', async () => {
    const fallback = join(root, 'default')
    const custom = join(root, 'busy')
    mkdirSync(custom, { recursive: true })
    writeFileSync(join(custom, 'file'), 'x')
    await assert.rejects(() => validateWorkspaceSelection(custom, fallback, fallback), /workspace-not-empty/)
  })

  it('rejects relative, missing, and file paths', async () => {
    const fallback = join(root, 'default')
    await assert.rejects(() => validateWorkspaceSelection('relative/path', fallback, fallback), /workspace-invalid-path/)
    await assert.rejects(() => validateWorkspaceSelection(join(root, 'missing'), fallback, fallback), /workspace-not-found/)
    const file = join(root, 'a-file')
    writeFileSync(file, 'x')
    await assert.rejects(() => validateWorkspaceSelection(file, fallback, fallback), /workspace-not-directory/)
  })

  it('treats the current custom directory as an unchanged no-op', async () => {
    const fallback = join(root, 'default')
    const custom = join(root, 'current')
    mkdirSync(custom, { recursive: true })
    writeFileSync(join(custom, 'session.jsonl.zstd'), 'x')
    const choice = await validateWorkspaceSelection(custom, fallback, custom)
    assert.deepEqual(choice, { path: custom, custom: true, unchanged: true })
  })
})
