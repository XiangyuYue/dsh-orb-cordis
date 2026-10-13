/**
 * Copy KaTeX's stylesheet and typefaces next to the vendored typesetter bundle.
 *
 * `katex.min.css` ships verbatim except for its `@font-face` source lists,
 * which are trimmed to the woff2 face: the helper's only engine is Chromium,
 * so the woff/truetype fallbacks would triple the payload for nothing. Every
 * face the trimmed sheet still asks for is then copied and checked, so a KaTeX
 * release that renames a font fails the build instead of silently rendering
 * formulas in a fallback font.
 *
 * Runs after the vendor tsdown build, whose `clean` wipes assets/vendor.
 */

import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const target = resolve(here, '../assets/vendor/katex')
const require = createRequire(import.meta.url)
const dist = join(dirname(require.resolve('katex/package.json')), 'dist')

const FACE = /url\(fonts\/([^)]+\.woff2)\)/g

/** Keep the woff2 source of every `@font-face` and nothing else. */
function trimSources(css) {
  return css.replace(/src:([^;}]+)/g, (_, list) =>
    `src:${String(list)
      .split(',')
      .filter((source) => source.includes('.woff2'))
      .join(',')}`)
}

const sheet = await readFile(join(dist, 'katex.min.css'), 'utf8')
const trimmed = trimSources(sheet)
const wanted = [...new Set([...trimmed.matchAll(FACE)].map((match) => match[1]))]
if (wanted.length === 0) throw new Error('vendor-katex: the trimmed sheet declares no woff2 face')

const available = new Set((await readdir(join(dist, 'fonts'))).filter((name) => name.endsWith('.woff2')))
const missing = wanted.filter((name) => !available.has(name))
if (missing.length > 0) throw new Error(`vendor-katex: katex/dist/fonts is missing ${missing.join(', ')}`)

await rm(target, { recursive: true, force: true })
await mkdir(join(target, 'fonts'), { recursive: true })
await writeFile(join(target, 'katex.min.css'), trimmed)
for (const name of wanted) {
  await cp(join(dist, 'fonts', name), join(target, 'fonts', name))
}

console.log(`vendor-katex: ${wanted.length} woff2 faces and katex.min.css are ready in ${target}`)
