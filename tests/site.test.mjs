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

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');
const BASE = '/lectopoint/';
const walk = (d) => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]));
const pages = walk(DIST).filter((f) => f.endsWith('.html'));
const html = Object.fromEntries(pages.map((f) => [f.slice(DIST.length), readFileSync(f, 'utf8')]));
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
  assert.match(xp, /id: 'lp-titre'/); assert.match(xp, /variants: \['a', 'b'\]/);
  assert.match(home, /data-xp-titre/);
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
    writeFileSync(f, text(h.replace(/<header[\s\S]*?<\/header>|<footer[\s\S]*?<\/footer>/g, ' ')));
    const out = execFileSync('node', [process.env.LINT_IA, f], { encoding: 'utf8' });
    const score = +(out.match(/(\d+)\s*\/\s*100/) || [])[1];
    assert.ok(score >= 85, `${p}: ${out.slice(0, 400)}`);
  }
});
