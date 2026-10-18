# Lectopoint par READ FRANCE

Free teacher tool at **https://outils.vread.fr/lectopoint/**: paste a public-domain text (or pick one of the classics in
`src/texts/`), the tool cuts it into parts, proposes one reading checkpoint per part (Vread's format: an open question
whose one-word answer is in the part's reference passage), checks the teacher's questions live with READ FRANCE's
reading engine, and exports a printable pupil sheet with its key, a CSV, or the engine's `read-france.checkpoints/1` JSON.
Nothing typed leaves the browser.

## The engine, in the browser

`src/assets/engine.js` is a browser bundle of **VREAD-corp/vread-reading-engine** (private) built by
`tools/bundle-engine.mjs` (esbuild, IIFE `ReadingEngine`). It contains the historical segmenter (H1, vread-workflow-def
`a5df9a9`, Vincent Cance, January 2026), the checkpoint builder and format, and the offline QA rules (H3: contributor
question rules, generation validator, answer presence, integrity) plus the engine's newer checks (evidence matching,
duplicates). The generation prompt is **not** bundled (`tools/shims/prompts-build.js` returns its version only);
`node:crypto` is replaced by a small synchronous SHA-1/SHA-256 (`tools/shims/crypto.js`). Every engine file in the
bundle, with its blob hash and historical origin, is in `src/assets/engine.provenance.json`.

```sh
ENGINE_DIR=../vread-reading-engine node tools/bundle-engine.mjs   # rebuild the bundle from a clean engine commit
npm test                                                           # build + static and engine checks
OCTAVE_CHECKOUT_WEB=../octave-checkout/gas/web LINT_IA=../vread-revenue-lab/content/lint-ia.mjs ENGINE_DIR=../vread-reading-engine npm test
npm run e2e                                                        # Chromium, 390 and 1280 px, ?octave_notrack=1
BASE_URL=https://outils.vread.fr/lectopoint/ node tests/e2e.mjs    # same, live
```

## Measurement

Site standards of READ FRANCE: `mesure.js` (v:2, cookieless, bots and `octave_notrack=1` counted apart) and `cro.js`,
byte-identical to `octave-checkout/gas/web`, posting to the octave-checkout Apps Script (site `lectopoint` whitelisted;
events `view`, `tool_use` = « Proposer les parties », `free_download` = an export, `cta_click` = a link to Lectoclasse,
Chapter Checks or Vread pour les écoles). A/B `rd-hero` (POOLED-READING-01, since 2026-10-19, by tab, home only, shared
with the 6 other reading sites and analysed pooled in vread-revenue-lab): b shows in the first screen three checkpoints the
engine proposed for *Le Horla* (verbatim; `tests/site.test.mjs` re-runs the engine to check them). Goals: `sample` (an
« exemple » link, `?texte=<slug>&exemple=1` opens the text already cut, via `assets/goals.js`), `tool`, `download`.
`lp-titre` (headline a/b by day) was stopped on 2026-10-18 with 0 exposures because it targeted the same hero.

Sitemap `lastmod` is the real date of each page's last content change: `src/lastmod.json` keeps a hash of each page's
title, description and body; the build stamps today's date (Paris) when it changes, and the CI test fails if the updated
file was not committed. Inner pages carry a visible breadcrumb and a BreadcrumbList; the home a WebApplication (free) and a
FAQPage matching the visible FAQ; the method page an Article (author READ FRANCE SAS, https://outils.vread.fr/a-propos/).

© 2026 READ FRANCE SAS. See LICENSE.
