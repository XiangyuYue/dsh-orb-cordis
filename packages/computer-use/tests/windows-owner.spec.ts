import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it, vi } from 'vitest'
import { appOwnerPid } from '../src/windows-foreground.ts'

const here = fileURLToPath(new URL('.', import.meta.url))

describe('app identity of a top-level window', () => {
  it('answers with the app inside a UWP frame, not with the frame host', () => {
    // The Settings window is an ApplicationFrameWindow owned by ApplicationFrameHost.exe (4292);
    // SystemSettings.exe (14404) owns its CoreWindow child, and that is the app being named.
    expect(appOwnerPid('ApplicationFrameWindow', 4292, () => 14404)).toBe(14404)
  })

  it('falls back to the frame own process when the frame has no CoreWindow child', () => {
    expect(appOwnerPid('ApplicationFrameWindow', 4292, () => undefined)).toBe(4292)
  })

  it('never walks the child windows for an ordinary top-level window', () => {
    const probe = vi.fn(() => 14404)
    expect(appOwnerPid('Notepad', 12, probe)).toBe(12)
    expect(probe).not.toHaveBeenCalled()
  })

  it('is the one derivation both listWindows and windowAppName go through', () => {
    // windows-native.ts loads koffi at module scope, so the wiring is pinned from source. Two
    // call sites and no inline frame special case: a third site that forgets the CoreWindow
    // fallback is exactly the defect this guards, and it made `hotkey` fail on every
    // UWP/Store window while the name check compared the frame host against the app.
    const native = readFileSync(join(here, '../src/windows-native.ts'), 'utf8')
    expect(native.match(/appOwnerPid\(/gu)).toHaveLength(2)
    expect(native).not.toMatch(/ApplicationFrameWindow/u)
  })
})
