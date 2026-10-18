// Static checks of the built site (npm test builds dist/ first).
// Optional local checks: OCTAVE_CHECKOUT_WEB=../octave-checkout/gas/web (mesure.js and cro.js byte-identical to the masters),
// LINT_IA=../vread-revenue-lab/content/lint-ia.mjs (anti-AI grid on every page's text).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync, mkdtempSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vmMod from 'node:vm';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');
const BASE = '/lectopoint/';
const walk = (d) => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]));
const pages = walk(DIST).filter((f) => f.endsWith('.html'));
const html = Object.fromEntries(pages.map((f) => [f.slice(DIST.length), readFileSync(f, 'utf8')]));
function await_vm() {
  const ctx = { window: {}, console, TextEncoder, TextDecoder, URL }; ctx.globalThis = ctx; ctx.self = ctx; vmMod.createContext(ctx);
  vmMod.runInContext(readFileSync(join(ROOT, 'src/assets/engine.js'), 'utf8'), ctx);
  return { E: ctx.ReadingEngine || ctx.window.ReadingEngine };
}
const text = (h) => h.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/g, ' ').replace(/\s+/g, ' ');

test('every page: lang fr, title, description, one h1, canonical (except 404), unique titles', () => {
  assert.equal(pages.length, 6);
  for (const [p, h] of Object.entries(html)) {
    assert.match(h, /<html lang="fr">/, p);
    assert.match(h, /<title>[^<]{20,}<\/title>/, p);
    assert.match(h, /<meta name="description" content="[^"]{60,}">/, p);
    assert.equal((h.match(/<h1[\s>]/g) || []).length, 1, `${p}: one h1`);
    if (p !== '/404.html') assert.match(h, new RegExp(`<link rel="canonical" href="https://outils\\.vread\\.fr${BASE}`), p);
    else assert.match(h, /noindex/);
  }
  const titles = Object.values(html).map((h) => h.match(/<title>([^<]+)/)[1]);
  assert.equal(new Set(titles).size, titles.length);
});

test('internal links and assets resolve to built files', () => {
  for (const [p, h] of Object.entries(html)) {
    for (const [, href] of h.matchAll(/(?:href|src)="(\/lectopoint\/[^"#?]*)/g)) {
      let f = join(DIST, href.slice(BASE.length));
      if (href.endsWith('/')) f = join(f, 'index.html');
      assert.ok(existsSync(f), `${p} -> ${href}`);
    }
  }
});

test('JSON-LD parses, names READ FRANCE SAS, no rating or review; the tool is a free WebApplication', () => {
  let app = 0;
  for (const [p, h] of Object.entries(html)) {
    for (const [, j] of h.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
      const d = JSON.parse(j);
      assert.ok(JSON.stringify(d).includes('READ FRANCE SAS'), p);
      assert.doesNotMatch(j, /aggregateRating|"review"|ratingValue/i, p);
      for (const n of d['@graph']) if (n['@type'] === 'WebApplication') { app += 1; assert.equal(n.offers.price, '0'); assert.equal(n.isAccessibleForFree, true); }
    }
  }
  assert.equal(app, 1);
});

test('tracking: xp.js then cro.js (site lectopoint), mesure.js v:2 knows lectopoint; no third-party script', () => {
  const mesure = readFileSync(join(DIST, 'mesure.js'), 'utf8');
  assert.match(mesure, /v:2/);
  assert.match(mesure, /lecto\[pg\]/);
  assert.ok(/^(kit-|veille-|declaration-|comprendre-|tcf-|visibilite-|lot-|civiclasse|chapter-checks|lecto[pg])/.test('lectopoint'));
  for (const [p, h] of Object.entries(html)) {
    assert.match(h, /<script src="\/lectopoint\/assets\/xp\.js"><\/script>\n<script src="\/lectopoint\/cro\.js" data-site="lectopoint" data-api="https:\/\/script\.google\.com\/macros\/s\/AKfycbzD1IRL8Q/, p);
    assert.match(h, /mesure\.js" defer/, p);
    assert.deepEqual([...h.matchAll(/<script[^>]+src="(https?:[^"]+)"/g)].map((m) => m[1]), [], p);
  }
  const home = html['/index.html'];
  assert.match(home, /id="lp-decouper" data-mesure="tool_use"/);
  assert.equal((home.match(/data-mesure="free_download"/g) || []).length, 3);
  const xp = readFileSync(join(DIST, 'assets/xp.js'), 'utf8');
  assert.match(xp, /id: 'rd-hero'/); assert.match(xp, /variants: \['a', 'b'\]/); assert.match(xp, /mode: 'tab'/); assert.match(xp, /param: 'hero'/);
  assert.match(xp, /pages: '\^\/lectopoint\/\$'/);
  assert.doesNotMatch(xp, /id: 'lp-titre'/, 'lp-titre stopped (same hero as rd-hero)');
  for (const h of Object.values(html)) assert.match(h, /data-cta="\[data-mesure\], \.btn, \[data-cta\]"/);
});

test('POOLED-READING-01: hero b excerpt is hidden by default, shown by html[data-xp-rd-hero="b"], and is real engine output', () => {
  const home = html['/index.html'];
  const hero = home.match(/<section class="hero" id="haut">([\s\S]*?)<\/section>/)[1];
  assert.match(hero, /<figure class="hero-excerpt" data-hero-excerpt>/);
  // The excerpt is first in the HTML (desktop float); on mobile CSS order puts it right after the CTA row (checked in e2e).
  assert.match(hero, /href="\/lectopoint\/\?texte=le-horla&amp;exemple=1" data-cta data-goal="sample"|href="\/lectopoint\/\?texte=le-horla&exemple=1" data-cta data-goal="sample"/);
  const css = readFileSync(join(DIST, 'assets/style.css'), 'utf8');
  assert.match(css, /\.hero-excerpt \{ display: none;/);
  assert.match(css, /html\[data-xp-rd-hero="b"\] \[data-hero-excerpt\] \{ display: block; \}/);
  // Re-run the engine bundle on Le Horla at the tool's size (1 500 words): the excerpt must be its verbatim output.
  const vm = await_vm();
  const E = vm.E, txt = readFileSync(join(ROOT, 'src/texts/le-horla.txt'), 'utf8').trim();
  const segs = E.segmentWholeText(txt, 1500, 'Partie');
  assert.equal(segs.length, 7);
  const t = text(hero);
  for (const n of [1, 2, 4]) {
    const fb = E.fallbackCheckpoint(segs[n - 1], segs, 'fr', 'Le Horla');
    const norm = (x) => x.replace(/[\u00a0\u202f]/g, ' ').replace(/\s+/g, ' ');
    assert.ok(norm(t).includes(norm(fb.question)), `part ${n} question`);
    assert.ok(norm(t).includes('Corrigé : ' + fb.answer), `part ${n} answer`);
  }
});

test('assets/goals.js on every page; free-sample links count goal sample', () => {
  for (const [p, h] of Object.entries(html)) assert.match(h, /<script src="\/lectopoint\/assets\/goals\.js" defer><\/script>/, p);
  assert.ok((html['/textes/index.html'].match(/data-goal="sample"/g) || []).length >= 9);
});

test('breadcrumbs (visible + BreadcrumbList) on inner pages; FAQPage matches the visible FAQ; method page is an Article', () => {
  for (const p of ['/methode/index.html', '/textes/index.html', '/confidentialite/index.html', '/mentions-legales/index.html']) {
    assert.match(html[p], /<nav class="ariane" aria-label="Fil d’Ariane"><ol><li><a href="https:\/\/outils\.vread\.fr\/">outils\.vread\.fr<\/a><\/li><li><a href="https:\/\/outils\.vread\.fr\/lectopoint\/">Lectopoint<\/a><\/li><li aria-current="page">/, p);
    const g = JSON.parse(html[p].match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1])['@graph'];
    const bc = g.find((n) => n['@type'] === 'BreadcrumbList');
    assert.equal(bc.itemListElement.length, 3, p);
  }
  const home = html['/index.html'];
  const g = JSON.parse(home.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1])['@graph'];
  const faq = g.find((n) => n['@type'] === 'FAQPage');
  const visible = [...home.matchAll(/<details><summary>([^<]+)<\/summary>/g)].map((m) => m[1].replace(/[\u00a0]/g, ' '));
  assert.deepEqual(faq.mainEntity.map((q) => q.name.replace(/[\u00a0]/g, ' ')), visible);
  const m = JSON.parse(html['/methode/index.html'].match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1])['@graph'].find((n) => n['@type'] === 'Article');
  assert.equal(m.author.url, 'https://outils.vread.fr/a-propos/');
  assert.match(m.dateModified, /^2026-\d\d-\d\d$/);
});

test('who writes: footer names Octave (AI agent) and the founders, links the hub « À propos »', () => {
  for (const [p, h] of Object.entries(html)) {
    assert.match(text(h), /écrits par Octave, l’agent IA de READ FRANCE/, p);
    assert.match(h, /<a href="https:\/\/outils\.vread\.fr\/a-propos\/">Qui fait ce site, et comment<\/a>/, p);
  }
});

test('cluster: texts page links each work to its Lectoguide guide and its Lectoclasse kit when one exists; no Jalonel', () => {
  const t = html['/textes/index.html'];
  assert.match(t, /href="https:\/\/outils\.vread\.fr\/lectoclasse\/kits\/le-menteur\/"/);
  assert.match(t, /href="https:\/\/outils\.vread\.fr\/lectoguide\/le-menteur\/"/);
  assert.match(t, /href="https:\/\/outils\.vread\.fr\/lectoguide\/contes-de-perrault\/"/);
  assert.match(t, /href="https:\/\/outils\.vread\.fr\/lectoclasse\/college\/"/);
  for (const [p, h] of Object.entries(html)) assert.doesNotMatch(h, /jalonel/i, p);
});

test('sitemap lastmod = committed src/lastmod.json (real date of the last content change), never in the future', () => {
  const lm = JSON.parse(readFileSync(join(ROOT, 'src/lastmod.json'), 'utf8'));
  const sm = readFileSync(join(DIST, 'sitemap.xml'), 'utf8');
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(new Date());
  for (const [, loc, d] of sm.matchAll(/<loc>([^<]+)<\/loc><lastmod>([^<]+)<\/lastmod>/g)) {
    const key = loc.replace('https://outils.vread.fr/lectopoint/', '') || '/';
    assert.equal(lm[key].date, d, key);
    assert.ok(d <= today && d >= '2026-10-16', d);
  }
  // The build rewrites src/lastmod.json when a page changes: a diff here means it was not committed with the change.
  if (process.env.CI) assert.equal(execFileSync('git', ['status', '--porcelain', 'src/lastmod.json'], { cwd: ROOT, encoding: 'utf8' }), '');
});

test('vendored mesure.js and cro.js are byte-identical to the octave-checkout masters', { skip: !process.env.OCTAVE_CHECKOUT_WEB }, () => {
  for (const f of ['mesure.js', 'cro.js']) assert.equal(readFileSync(join(ROOT, 'src/assets', f), 'utf8'), readFileSync(join(process.env.OCTAVE_CHECKOUT_WEB, f), 'utf8'), f);
});

test('brand: « Lectopoint par READ FRANCE », endorsed line, no « Vread » product name, no claim we cannot back', () => {
  for (const [p, h] of Object.entries(html)) {
    const t = text(h);
    assert.match(h, /Lectopoint<small>par READ FRANCE<\/small>/, p);
    assert.match(t, /activité de READ FRANCE, l’éditeur de Vread/, p);
    assert.doesNotMatch(t, /Vread (Lectopoint|Classe|Lecto)|Lectopoint Vread/, p);
    assert.doesNotMatch(t, /garanti|certifi|officiel|savoir qui a (vraiment )?lu|agréé/i, p);
  }
});

test('home links to the paid ready-made packs and the Vread schools offer, tracked as cta_click', () => {
  const h = html['/index.html'];
  for (const url of ['https://outils.vread.fr/lectoclasse/', 'https://outils.vread.fr/chapter-checks/', 'https://www.vread.fr/ecoles']) {
    assert.match(h, new RegExp(`href="${url.replace(/[./]/g, '\\$&')}" data-mesure="cta_click"`), url);
  }
});

test('privacy page: nothing typed leaves the browser, aggregate cookieless measurement', () => {
  const t = text(html['/confidentialite/index.html']);
  assert.match(t, /restent dans votre navigateur/);
  assert.match(t, /ni cookie, ni adresse IP, ni identifiant/);
  assert.match(t, /Do Not Track/);
});

test('sitemap lists the 5 indexable pages', () => {
  const sm = readFileSync(join(DIST, 'sitemap.xml'), 'utf8');
  assert.equal((sm.match(/<loc>/g) || []).length, 5);
  assert.doesNotMatch(sm, /404/);
});

test('texts: public domain (authors dead before 1925), Wikisource source, real length', () => {
  const list = JSON.parse(readFileSync(join(DIST, 'textes/data/index.json'), 'utf8'));
  assert.ok(list.length >= 3);
  for (const t of list) {
    assert.ok(+t.authorDates.split('-')[1] < 1925, t.slug);
    assert.match(t.url, /^https:\/\/fr\.wikisource\.org\/wiki\//, t.slug);
    assert.ok(t.words >= 1500, t.slug);
    const body = readFileSync(join(DIST, 'textes/data', t.slug + '.txt'), 'utf8');
    assert.doesNotMatch(body, /►|◄|\[\d+\]/, `${t.slug}: navigation or note markers left`);
  }
});

test('anti-AI grid (lint-ia) on every page', { skip: !process.env.LINT_IA }, () => {
  const dir = mkdtempSync(join(tmpdir(), 'lp-lint-'));
  for (const [p, h] of Object.entries(html)) {
    if (p === '/404.html') continue;
    const f = join(dir, p.replace(/\//g, '_') + '.txt');
    // .mini-feuille holds verbatim Maupassant (the engine's excerpt of Le Horla): quoted source text, not our writing.
    writeFileSync(f, text(h.replace(/<header[\s\S]*?<\/header>|<footer[\s\S]*?<\/footer>|<div class="mini-feuille">[\s\S]*?<\/div>/g, ' ')));
    const out = execFileSync('node', [process.env.LINT_IA, f], { encoding: 'utf8' });
    const score = +(out.match(/(\d+)\s*\/\s*100/) || [])[1];
    assert.ok(score >= 85 && /\/100\s+OK/.test(out), `${p}: ${out.slice(0, 400)}`);
  }
});
