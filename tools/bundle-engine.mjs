// Bundles READ FRANCE's reading engine for the browser: src/assets/engine.js (IIFE, global `ReadingEngine`) and
// src/assets/engine.provenance.json (engine commit, every engine source file in the bundle with its git blob hash and
// its origin in PROVENANCE.md). Run locally with the private engine checked out next to this repo:
//   ENGINE_DIR=../vread-reading-engine node tools/bundle-engine.mjs
// The bundle is committed: GitHub Actions never needs the private engine. tests/engine.test.mjs re-checks it.
import { build } from '../../vread-reading-engine/node_modules/esbuild/lib/main.js';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ENGINE = resolve(ROOT, process.env.ENGINE_DIR || '../vread-reading-engine');
const git = (...a) => execFileSync('git', ['-C', ENGINE, ...a], { encoding: 'utf8' }).trim();
const commit = git('rev-parse', 'HEAD');
if (git('status', '--porcelain', 'src')) throw new Error('engine src/ has uncommitted changes: bundle from a clean commit');

const shim = (f) => join(ROOT, 'tools/shims', f);
const plugin = {
  name: 'read-france-browser',
  setup(b) {
    b.onResolve({ filter: /^@engine\// }, (a) => ({ path: join(ENGINE, 'src', a.path.slice(8) + '.ts') }));
    b.onResolve({ filter: /^node:crypto$/ }, () => ({ path: shim('crypto.js') }));
    b.onResolve({ filter: /^node:(fs|path|fs\/promises)$/ }, () => ({ path: shim('empty.js') }));
    // The generation prompt is private: the checkpoint builder only needs its version string.
    b.onResolve({ filter: /prompts\/build$/ }, () => ({ path: shim('prompts-build.js') }));
  },
};

const res = await build({
  entryPoints: [join(ROOT, 'tools/engine-entry.ts')], bundle: true, format: 'iife', globalName: 'ReadingEngine',
  platform: 'browser', target: 'es2020', minify: false, legalComments: 'none', metafile: true, write: false, charset: 'utf8',
  plugins: [plugin],
  banner: { js: `/*! READ FRANCE reading engine, browser bundle for Lectopoint. © 2026 READ FRANCE SAS, proprietary (VREAD-corp/vread-reading-engine@${commit.slice(0, 7)}). Segmenter and QA rules from vread-workflow-def a5df9a9 (Vincent Cance); provenance: engine.provenance.json */` },
});
const code = res.outputFiles[0].text;
for (const forbidden of ['ONE_WORD_RULES', 'MÉTADONNÉES DU TEXTE', 'Tu es', 'You are']) {
  if (code.includes(forbidden)) throw new Error(`bundle contains prompt text: ${forbidden}`);
}
writeFileSync(join(ROOT, 'src/assets/engine.js'), code);

const prov = readFileSync(join(ENGINE, 'PROVENANCE.md'), 'utf8');
const files = Object.keys(res.metafile.inputs).map((p) => resolve(ROOT, p)).filter((p) => p.startsWith(ENGINE + '/src/')).map((p) => {
  const rel = relative(ENGINE, p);
  const row = prov.split('\n').find((l) => l.startsWith(`| \`${rel}\``));
  const cells = row ? row.split('|').map((c) => c.trim()) : [];
  return { file: rel, blob: git('rev-parse', `${commit}:${rel}`), component: cells[2] || 'new (Octave for READ FRANCE SAS, 2026-10-16)',
    status: cells[3] || 'new', historicalSource: cells[4] ? cells[4].replace(/`/g, '') : null, sourceBlobAtA5df9a9: cells[5] ? cells[5].replace(/`/g, '') : null };
}).sort((a, b) => a.file.localeCompare(b.file));
writeFileSync(join(ROOT, 'src/assets/engine.provenance.json'), JSON.stringify({
  engine: 'VREAD-corp/vread-reading-engine', commit, historicalSnapshot: 'vread-workflow-def a5df9a949a2fdf44a94280aa6da61875878d2bec (2026-10-07)',
  excluded: ['src/prompts/build.ts (replaced by tools/shims/prompts-build.js: the generation prompt stays private)'],
  shims: ['node:crypto -> tools/shims/crypto.js', 'node:fs, node:path -> tools/shims/empty.js'], bytes: Buffer.byteLength(code), files,
}, null, 2) + '\n');
console.log(`engine.js ${Buffer.byteLength(code)} bytes, ${files.length} engine files, engine ${commit.slice(0, 7)}`);
