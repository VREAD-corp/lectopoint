// The browser bundle of READ FRANCE's reading engine (src/assets/engine.js): provenance, no private prompt, and the same
// results as the engine itself. ENGINE_DIR=../vread-reading-engine adds the checks against the private engine checkout.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const code = readFileSync(join(ROOT, 'src/assets/engine.js'), 'utf8');
const prov = JSON.parse(readFileSync(join(ROOT, 'src/assets/engine.provenance.json'), 'utf8'));
const ctx = { TextEncoder, console };
vm.createContext(ctx);
vm.runInContext(code + ';this.E = ReadingEngine;', ctx);
const E = ctx.E;
const SAMPLE = readFileSync(join(ROOT, 'src/texts/la-parure.txt'), 'utf8');

test('banner and provenance name the same engine commit; historical files are listed with their origin', () => {
  assert.ok(code.startsWith(`/*! READ FRANCE reading engine`));
  assert.ok(code.includes(`vread-reading-engine@${prov.commit.slice(0, 7)}`));
  assert.equal(prov.bytes, Buffer.byteLength(code));
  const hist = prov.files.filter((f) => /^H\d/.test(f.component)).map((f) => f.file);
  for (const f of ['src/ingest/segmenter.ts', 'src/qa/question-rules.ts', 'src/qa/answer-presence.ts', 'src/qa/validator.ts', 'src/qa/integrity.ts']) assert.ok(hist.includes(f), f);
});

test('the private generation prompt is not in the bundle', () => {
  for (const s of ['ONE_WORD_RULES', 'MÉTADONNÉES DU TEXTE', 'TEXT METADATA', 'promptV4', 'Tu es un', 'You are a']) assert.ok(!code.includes(s), s);
});

test('segments, windows, template and checks behave as Vread’s method', () => {
  const segs = E.segmentWholeText(SAMPLE, 500, 'Partie');
  assert.equal(segs.length, Math.ceil(SAMPLE.split(/\s+/).filter(Boolean).length / 500));
  assert.ok(segs.every((s) => s.analysisWindow.excerpt.length > 0));
  const fb = E.fallbackCheckpoint(segs[1], segs, 'fr', 'La Parure');
  assert.match(fb.question, /^Quel mot manque dans ce passage \(Partie 2\)/);
  assert.ok(fb.question.length <= 160);
  const rows = segs.map((s) => E.fallbackCheckpoint(s, segs, 'fr', 'La Parure')).filter(Boolean);
  const file = E.buildCheckpoints({ title: 'La Parure', author: 'Guy de Maupassant', language: 'fr', segments: segs, rows, mode: 'words', segmentWordCount: 500, allowPending: true, engineVersion: E.ENGINE_VERSION });
  assert.equal(file.format, 'read-france.checkpoints/1');
  assert.equal(file.prompt_version, 'engine:v4');
  assert.equal(file.source[0].sha256.length, 64);
  assert.ok(file.checkpoints.length === rows.length);
  const yesNo = E.checkQuestion({ question: 'Est-ce que Mathilde aime sa robe de bal ce soir-là ?', answer: 'robe', answerPage: 1 }, { language: 'fr', range: null });
  assert.ok(yesNo.blocking.some((r) => r.code === 'question_yes_no'));
});

const ENGINE = process.env.ENGINE_DIR && resolve(ROOT, process.env.ENGINE_DIR);
test('same results as the engine checkout (CLI) on the same text', { skip: !ENGINE || !existsSync(join(ENGINE ?? '', 'src')) }, () => {
  const head = execFileSync('git', ['-C', ENGINE, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  for (const f of prov.files) assert.equal(execFileSync('git', ['-C', ENGINE, 'rev-parse', `${prov.commit}:${f.file}`], { encoding: 'utf8' }).trim(), f.blob, f.file);
  const script = `import { segmentWholeText, fallbackCheckpoint } from "./src/checkpoints/build.ts"; import { readFileSync } from "node:fs";
    const t = readFileSync(${JSON.stringify(join(ROOT, 'src/texts/la-parure.txt'))}, "utf8"); const s = segmentWholeText(t, 500, "Partie");
    console.log(JSON.stringify({ s: s.map((x) => [x.wordCount, x.analysisWindow.startWord, x.analysisWindow.endWord, x.sha256]), f: s.map((x) => fallbackCheckpoint(x, s, "fr", "La Parure")) }));`;
  const out = JSON.parse(execFileSync('npx', ['tsx', '--eval', script], { cwd: ENGINE, encoding: 'utf8' }));
  const segs = E.segmentWholeText(SAMPLE, 500, 'Partie');
  assert.deepEqual(JSON.parse(JSON.stringify(segs.map((x) => [x.wordCount, x.analysisWindow.startWord, x.analysisWindow.endWord, x.sha256]))), out.s);
  assert.deepEqual(JSON.parse(JSON.stringify(segs.map((x) => E.fallbackCheckpoint(x, segs, 'fr', 'La Parure')))), out.f);
  assert.ok(head === prov.commit || execFileSync('git', ['-C', ENGINE, 'merge-base', '--is-ancestor', prov.commit, head]).length === 0);
});
