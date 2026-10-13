import { defineConfig } from 'tsdown'

/** Browser vendor bundles for the ball window page (shiki + grammars, KaTeX). */
export default defineConfig({
  entry: { shiki: 'src/vendor-shiki.ts', katex: 'src/vendor-katex.ts' },
  outDir: 'assets/vendor',
  format: ['esm'],
  platform: 'browser',
  target: 'es2024',
  fixedExtension: false,
  dts: false,
  clean: true,
  minify: true,
})
