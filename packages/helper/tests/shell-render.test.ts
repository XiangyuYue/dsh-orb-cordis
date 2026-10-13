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

  it('keeps the ball wrapped: only the panel far edge moves for the strip', () => {
    const css = readFileSync(join(here, '../assets/floating.css'), 'utf8')
    // The panel is the window minus its chrome, so the ball at the near edge always sits
    // inside it: a stale strip state must never leave the ball outside the panel.
    assert.equal(/--panel-w|width:\s*var\(--panel-w\)/.test(css), false)
    assert.match(css, /#panel \{\s*position: absolute;\s*inset: var\(--chrome\);/)
    // The panel and the strip are placed from the same offset, so they cannot drift apart.
    assert.match(css, /--panel-left:\s*calc\(var\(--chrome\) \+ var\(--strip-w\)\)/)
    assert.match(css, /body\.has-strip\.strip-left #panel \{\s*left:\s*var\(--panel-left\);\s*right: var\(--chrome\);/)
    assert.match(css, /body\.has-strip\.strip-right #panel \{\s*right: var\(--panel-left\);\s*left: var\(--chrome\);/)
    assert.match(css, /body\.has-strip\.strip-left #agent-strip \{\s*left:\s*0;\s*width:\s*calc\(var\(--panel-left\) \+ var\(--strip-tuck\)\)/)
    // The old rules sized the strip from a hard-coded panel width instead of the panel's own.
    assert.equal(css.includes('right: calc(320px'), false)
    // `--panel-left` is declared on the root and computes with `--strip-w`, so the page must
    // set that one on the root too: a body-scoped value would leave the offset at 12px.
    assert.match(code, /document\.documentElement\.style\.setProperty\('--strip-w'/)
    assert.equal(code.includes("document.body.style.setProperty('--strip-w'"), false)
  })

  it('re-syncs the host geometry whenever the reservation and the chips disagree', () => {
    // Both directions, and even while the strip is hidden: the reservation follows the chip
    // list, so a missed message would either cover the chips or leave a gap beside them.
    assert.match(code, /if \(document\.body\.classList\.contains\('has-strip'\) !== \(agentItems\.length > 0\)\) void syncStrip\(\)/)
    assert.match(code, /async function syncStrip\(\)/)
    assert.match(code, /await api\.syncStrip\?\.\(\)/)
    // Once on startup, so a state message lost across a page load heals before the first hover.
    assert.match(code, /syncGif\(\)\n(?:\s*\/\/[^\n]*\n)*\s+void syncStrip\(\)\n\}/)
  })
})

/**
 * A turn in the conversation on screen must be visible: the ball comes back from the screen edge,
 * the panel opens and stays pinned. The page only ever sees the displayed conversation's turns —
 * the host streams that one session — so this cannot fire for a background conversation's agent.
 */
describe('agent work keeps the panel on screen', () => {
  it('promotes the panel from the collapsed and docked states when a turn starts', () => {
    assert.match(code, /if \(next\) \{\n(?:\s*\/\/[^\n]*\n)*\s+void showWorkPanel\(\)/)
    assert.match(code, /async function showWorkPanel\(\) \{\n\s+if \(pageClosed\(\)\) return\n(?:\s*\/\/[^\n]*\n)*\s+if \(docked !== undefined\) await unsnapDocked\(\)\n\s+await setExpanded\(true\)\n\s+pinBall\(\)/)
  })

  it('never collapses or docks while the turn is running', () => {
    // Every collapse path already consults `running`; the dock paths carry it to the main process
    // as `canDock`, which is what stops a release on a screen edge from docking.
    assert.match(code, /function scheduleCollapse\(\) \{\n\s+if \(pinned \|\| running \|\| asking\(\) \|\| dragging\) return/)
    assert.match(code, /if \(!force && \(pinned \|\| running \|\| asking\(\)\)\) return/)
    assert.match(code, /api\.dragEnd\(!\(running \|\| asking\(\)\)\)/)
    assert.match(code, /api\.dragMove\(!\(running \|\| asking\(\)\)\)/)
  })

  it('locks only the two conversation-switch controls, and only while running', () => {
    assert.match(code, /function setWorkLocked\(locked\) \{[\s\S]{0,220}document\.body\.classList\.toggle\('work-locked', locked\)/)
    // The lock follows the turn, and a transcript reset (a conversation switch) clears it.
    assert.match(code, /setWorkLocked\(running\)/)
    assert.match(code, /function clearTranscript\(\) \{[\s\S]{0,600}setRunning\(false\)/)
    // Both controls answer a click while locked with the inline notice instead of switching.
    assert.match(code, /historyButton\.addEventListener\('click', \(\) => \{\n\s+if \(workLocked\) \{\n\s+showHint\(messages\.workLocked\)/)
    assert.match(code, /newConversation\.addEventListener\('click', \(\) => \{\n\s+if \(workLocked\) \{\n\s+showHint\(messages\.workLocked\)/)
    // A notice, never a dialog, and it clears itself.
    assert.match(code, /hintTimer = setTimeout\(\(\) => \{\n\s+hintTimer = undefined\n\s+hint\.hidden = true\n\s+\}, HINT_MS\)/)
    assert.equal(code.includes('confirm('), false)
    assert.equal(code.includes('alert('), false)
  })

  it('gives both locked controls a tooltip that explains the refusal', () => {
    assert.match(code, /historyButton\.title = workLocked \? messages\.historyLocked : messages\.history/)
    assert.match(code, /newConversation\.title = workLocked \? messages\.newLocked : messages\.fresh/)
    assert.match(code, /function refreshAllText\(\) \{\n\s+applyStaticText\(\)\n\s+applyLockedLabels\(\)/)
  })

  it('ships the notice element and its styles', () => {
    const html = readFileSync(join(here, '../assets/floating.html'), 'utf8')
    const css = readFileSync(join(here, '../assets/floating.css'), 'utf8')
    assert.match(html, /<p id="hint" role="status" hidden><\/p>/)
    assert.match(css, /body\.work-locked #history,\nbody\.work-locked #new-conversation \{\n\s+opacity: 0\.45;/)
  })
})
