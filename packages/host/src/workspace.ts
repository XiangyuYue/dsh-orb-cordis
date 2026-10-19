/**
 * Validate the floating-ball Agent workspace selected in the settings card.
 * A custom workspace must be an existing directory and may already contain files.
 * The old workspace is never touched.
 */

import { stat } from 'node:fs/promises'
import { isAbsolute, resolve } from 'node:path'

export interface WorkspaceSelection {
  readonly path: string
  readonly custom: boolean
  /** The request asks for the path already in use; nothing to do. */
  readonly unchanged: boolean
}

export async function validateWorkspaceSelection(
  value: string,
  defaultPath: string,
  currentPath: string,
): Promise<WorkspaceSelection> {
  const raw = value.trim()
  if (raw === '' || raw.length > 4096 || raw.includes('\0') || !isAbsolute(raw)) {
    throw new Error('workspace-invalid-path')
  }
  const path = resolve(raw)
  const defaultValue = resolve(defaultPath)
  const current = resolve(currentPath)
  const custom = path !== defaultValue
  if (path === current) return { path, custom, unchanged: true }
  if (custom) {
    let info
    try {
      info = await stat(path)
    } catch (error) {
      const code = (error as { code?: unknown }).code
      throw new Error(code === 'ENOENT' ? 'workspace-not-found' : 'workspace-not-readable')
    }
    if (!info.isDirectory()) throw new Error('workspace-not-directory')
  }
  return { path, custom, unchanged: false }
}
