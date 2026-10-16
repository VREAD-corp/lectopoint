// Browser test of the tool (Chromium, 390 and 1280 px). Local by default; live with BASE_URL=https://outils.vread.fr/lectopoint/
// Always loads with ?octave_notrack=1: our own visits are counted apart (Exclus), never as audience.
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { serve } from './serve.mjs';

let srv = null;
let BASE = process.env.BASE_URL;
if (!BASE) { srv = await serve(0); BASE = `http://127.0.0.1:${srv.address().port}/lectopoint/`; }
const browser = await chromium.launch();
const results = [];
const step = async (name, fn) => { try { await fn(); results.push(['ok', name]); } catch (e) { results.push(['FAIL', name + ': ' + e.message]); } };

for (const width of [390, 1280]) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, acceptDownloads: true, locale: 'fr-FR' });
  const page = await ctx.newPage();
  const errors = [];
  const hits = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('request', (r) => { if (r.url().includes('script.google.com')) hits.push(r.postData() || ''); });
  await page.goto(BASE + '?octave_notrack=1', { waitUntil: 'networkidle' });

  await step(`${width}: no horizontal scroll`, async () => {
    const sw = await page.evaluate(() => document.documentElement.scrollWidth);
    assert.ok(sw <= width + 1, `scrollWidth ${sw}`);
  });
  await step(`${width}: library loads and a text fills the form`, async () => {
    await page.waitForFunction(() => document.querySelectorAll('#lp-texte option').length > 3);
    await page.selectOption('#lp-texte', 'la-parure');
    await page.waitForFunction(() => document.querySelector('#lp-colle').value.length > 10000);
    assert.equal(await page.inputValue('#lp-titre'), 'La Parure');
    assert.equal(await page.inputValue('#lp-taille'), '500');
  });
  await step(`${width}: cutting proposes parts with an engine template each`, async () => {
    await page.click('#lp-decouper');
    await page.waitForSelector('.partie');
    const n = await page.locator('.partie').count();
    assert.ok(n >= 5 && n <= 7, `${n} parts`);
    const q = await page.locator('.partie').first().locator('[data-f="question"]').inputValue();
    assert.match(q, /Quel mot manque dans ce passage/);
    assert.match(await page.textContent('#lp-bilan'), /sur \d+/);
  });
  await step(`${width}: a teacher question is checked live (fail, then pass)`, async () => {
    const card = page.locator('.partie').nth(1);
    const q = card.locator('[data-f="question"]');
    await q.fill('Est-ce que Mathilde est contente de sa robe neuve ?');
    await card.locator('[data-f="answer"]').fill('Forestier');
    await page.waitForTimeout(100);
    const bad = await card.locator('.controles').textContent();
    assert.match(bad, /oui\/non|oui ou non/i, bad);
    // A real open question whose one-word answer is in the reference passage of the part.
    const word = await card.locator('.chip[data-mot]').first().getAttribute('data-mot');
    await card.locator('.chip[data-mot]').first().click();
    await q.fill(`Quel mot du passage de référence la question attend-elle ici, en un seul mot ?`);
    await page.waitForTimeout(100);
    const good = await card.locator('.controles').textContent();
    assert.match(good, /Point de contrôle prêt/, good + ' / ' + word);
    assert.ok((await card.locator('[data-f="evidence"]').inputValue()).length > 10, 'evidence auto-filled');
  });
  await step(`${width}: CSV and JSON exports download with the engine format`, async () => {
    const [csv] = await Promise.all([page.waitForEvent('download'), page.click('#lp-csv')]);
    const c = readFileSync(await csv.path(), 'utf8');
    assert.ok(c.startsWith('﻿partie;libellé;début;fin;mots;question;réponse;passage;prêt;règles en échec'), c.slice(0, 80));
    assert.ok(c.trim().split('\r\n').length >= 6);
    const [js] = await Promise.all([page.waitForEvent('download'), page.click('#lp-json')]);
    const j = JSON.parse(readFileSync(await js.path(), 'utf8'));
    assert.equal(j.format, 'read-france.checkpoints/1');
    assert.equal(j.prompt_version, 'engine:v4');
    assert.ok(j.checkpoints.length >= 5 && j.checkpoints.some((cp) => cp.ok));
  });
  await step(`${width}: print sheet is built`, async () => {
    await page.evaluate(() => { window.print = () => {}; });
    await page.click('#lp-imprimer');
    const h = await page.innerHTML('#impression');
    assert.match(h, /Corrigé/); assert.match(h, /Nom :/);
  });
  await step(`${width}: tracking is excluded (notrack) and nothing typed is sent`, async () => {
    await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
    for (const h of hits) { assert.doesNotMatch(h, /Mathilde|Forestier/); if (h.includes('"event"')) assert.match(h, /"excluded":"notrack"/); }
  });
  await step(`${width}: no page error`, async () => assert.deepEqual(errors, []));
  await ctx.close();
}

await step('title-based cutting on a play (acts)', async () => {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(BASE + '?octave_notrack=1');
  const play = ['ACTE PREMIER', ...Array(400).fill('Le valet entre et parle au maître de la maison du port.'), 'ACTE II', ...Array(400).fill('La servante cache la clef dans le coffre du jardin.'), 'ACTE III', ...Array(400).fill('Le notaire arrive avec le contrat et la plume.')].join('\n');
  await page.fill('#lp-colle', play);
  await page.check('input[value="titres"]');
  await page.click('#lp-decouper');
  await page.waitForSelector('.partie');
  assert.equal(await page.locator('.partie').count(), 3);
  assert.match(await page.locator('.partie h3').first().textContent(), /Acte premier/);
  await ctx.close();
});

await browser.close();
if (srv) srv.close();
for (const [s, n] of results) console.log(s.padEnd(4), n);
const failed = results.filter(([s]) => s !== 'ok').length;
console.log(`${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
