/* Lectopoint A/B test (read by cro.js, which loads after this file).
 * POOLED-READING-01 (2026-10-19): hero a = current, b = first screen shows a real excerpt of the deliverable. Same id on the 7 reading sites, pooled analysis in vread-revenue-lab. ?hero=b forces b.
 * Here b shows, in the first screen, three checkpoints the engine proposed for Le Horla (parts 1, 2 and 4, verbatim).
 * Metric: first CTA click (built in); goals 'sample' (the Le Horla example opened), 'tool' (a text cut into parts), 'download' (an export).
 * lp-titre (headline a/b by day, 2026-10-16) stopped on 2026-10-18 with 0 exposures: it targeted the same hero. Its text a stays. */
window.OCTAVE_XP = [{
  id: 'rd-hero',
  variants: ['a', 'b'],
  mode: 'tab',
  param: 'hero',
  pages: '^/lectopoint/$',
}];
