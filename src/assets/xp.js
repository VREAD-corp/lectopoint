/* Lectopoint A/B test (read by cro.js, which loads after this file): headline of the tool page, by calendar day (Paris).
 * a = the task (« points de contrôle… prêts à imprimer »), b = the method (« une question par partie, une réponse d’un mot »).
 * ?titre=a|b forces one. Goal 'tool' = a text cut into parts, 'download' = an export. */
window.OCTAVE_XP = [{
  id: 'lp-titre',
  variants: ['a', 'b'],
  mode: 'day',
  tz: 'Europe/Paris',
  param: 'titre',
  pages: '^/lectopoint/$',
  swap: { b: [['[data-xp-titre]', 'text', 'Une question par partie, une réponse d’un mot : vos contrôles de lecture']] },
}];
