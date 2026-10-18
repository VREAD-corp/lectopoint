/* A/B goals on links (cro.js): a click on an element with data-goal="<name>" counts that goal once per tab. */
document.addEventListener('click', function (e) {
  var a = e.target.closest && e.target.closest('[data-goal]');
  if (!a) return;
  try { window.octaveCro && window.octaveCro.goal(a.getAttribute('data-goal')); } catch (err) { /* measurement never blocks a link */ }
}, true);
