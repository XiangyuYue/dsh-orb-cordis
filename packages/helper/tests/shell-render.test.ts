import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * The ball page is a browser-only module (window/document at import time), so
 * these rendering fixes are pinned at the source level, the way drag-input and
 * transcript-model guard shell.js. Comments are stripped: only live code counts.
 */
const here = fileURLToPath(new URL('.', import.meta.url))
const shell = readFileSync(join(here, '../assets/shell.js'), 'utf8')
const code = shell.replaceAll(/\/\*[\s\S]*?\*\//g, '').replaceAll(/^\s*\/\/.*$/gm, '')
const highlight = readFileSync(join(here, '../assets/highlight.js'), 'utf8')

describe('ball page render guards', () => {
  it('appends the web-fetch meta without the undefined url reference', () => {
    assert.match(code, /fetch\.append\(meta\)/)
    assert.equal(code.includes('fetch.append(url'), false)
  })

  it('keeps drawing the rest of a frame when one item fails', () => {
    assert.match(code, /for \(const item of list\) \{\s*try \{/)
    assert.match(code, /catch \(error\) \{\s*console\.error\(/)
  })

  it('builds chip icons as nodes instead of innerHTML strings', () => {
    assert.match(code, /status\.replaceChildren\(icon\(/)
    assert.equal(code.includes('status.innerHTML = icon('), false)
  })

  it('keeps the card expander mounted while it toggles the hidden rows', () => {
    assert.equal(code.includes('expand.remove()'), false)
    assert.match(code, /target\.insertBefore\(row, expand\)/)
    assert.match(code, /expand\.textContent = open \? chatLabels\.collapse/)
  })

  it('copies the rows the tool cards show, read at click time', () => {
    // The reader runs on click, so the clipboard follows the cap and the expander.
    assert.match(code, /copyText\(copy, \(\) => terminalCopyText\(/)
    assert.match(code, /querySelectorAll\('\.term-line'\)/)
    assert.match(code, /copyText\(copy, \(\) => readCopyText\(/)
    assert.match(code, /querySelectorAll\('\.read-content'\)/)
    assert.match(code, /copyText\(copy, \(\) => searchCopyText\(/)
    assert.match(code, /querySelectorAll\('\.search-file-path, \.search-line'\)/)
  })

  it('re-upgrades tracked roots once a lazy grammar lands', () => {
    assert.match(highlight, /const root = ref\.deref\(\)/)
    assert.match(highlight, /upgradeCodeBlocks\(root, \{ track: false \}\)/)
  })

  it('tracks a re-rendered root once instead of once per render', () => {
    assert.match(highlight, /known = new WeakSet\(\)/)
    assert.match(highlight, /if \(track && !known\.has\(root\)\)/)
    assert.equal(highlight.includes('if (track) tracked.add(new WeakRef(root))'), false)
  })

  it('keeps the panel width constant and the strip beside it', () => {
    const css = readFileSync(join(here, '../assets/floating.css'), 'utf8')
    // The panel's width is a constant, so no window or strip state can stretch it.
    assert.match(css, /--panel-w:\s*320px/)
    assert.match(css, /width:\s*var\(--panel-w\)/)
    // The panel and the strip are placed from the same offset, so they cannot drift apart.
    assert.match(css, /--panel-left:\s*calc\(var\(--chrome\) \+ var\(--strip-w\)\)/)
    assert.match(css, /body\.has-strip\.strip-left #panel \{\s*left:\s*var\(--panel-left\)/)
    assert.match(css, /body\.has-strip\.strip-left #agent-strip \{\s*left:\s*0;\s*width:\s*calc\(var\(--panel-left\) \+ var\(--strip-tuck\)\)/)
    // The old rules sized the strip from a hard-coded panel width instead of the panel's own.
    assert.equal(css.includes('right: calc(320px'), false)
    // `--panel-left` is declared on the root and computes with `--strip-w`, so the page must
    // set that one on the root too: a body-scoped value would leave the offset at 12px.
    assert.match(code, /document\.documentElement\.style\.setProperty\('--strip-w'/)
    assert.equal(code.includes("document.body.style.setProperty('--strip-w'"), false)
  })

  it('re-applies the host geometry when chips render without a reserved strip', () => {
    assert.match(code, /if \(!document\.body\.classList\.contains\('has-strip'\)\) void syncStrip\(\)/)
    assert.match(code, /async function syncStrip\(\)/)
    assert.match(code, /await api\.syncStrip\?\.\(\)/)
  })
})
