/* Lectopoint par READ FRANCE : the teacher tool. Everything runs in this page with READ FRANCE's reading engine
 * (assets/engine.js, global ReadingEngine): segmentation (historical segmenter), checkpoint template per part,
 * offline QA rules (form, answer present in the text, duplicates). No text, question or answer leaves the browser. */
(function () {
  'use strict';
  var E = window.ReadingEngine;
  var root = document.getElementById('outil');
  if (!E || !root) return;
  var BASE = root.getAttribute('data-base') || '/lectopoint/';
  var $ = function (sel, el) { return (el || document).querySelector(sel); };
  var $$ = function (sel, el) { return Array.prototype.slice.call((el || document).querySelectorAll(sel)); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };
  var nf = function (n) { return Number(n).toLocaleString('fr-FR'); };
  var goal = function (g) { try { window.octaveCro && window.octaveCro.goal(g); } catch (e) { /* measurement never blocks the tool */ } };

  var state = { library: [], text: '', title: '', author: '', language: 'fr', mode: 'words', size: 1000, segments: [], rows: [], file: null };

  // ---------------------------------------------------------------- texts
  var sel = $('#lp-texte'), area = $('#lp-colle'), tIn = $('#lp-titre'), aIn = $('#lp-auteur'), info = $('#lp-texte-info');
  fetch(BASE + 'textes/data/index.json').then(function (r) { return r.json(); }).then(function (list) {
    state.library = list;
    list.forEach(function (t) {
      var o = document.createElement('option');
      o.value = t.slug; o.textContent = t.title + ', ' + t.author + ' (' + nf(t.words) + ' mots)';
      sel.appendChild(o);
    });
    var want = new URLSearchParams(location.search).get('texte');
    if (want && list.some(function (t) { return t.slug === want; })) { sel.value = want; pick(); }
  }).catch(function () { info.textContent = 'La liste des textes n’a pas pu être chargée. Vous pouvez coller un texte.'; });

  function pick() {
    var t = state.library.filter(function (x) { return x.slug === sel.value; })[0];
    if (!t) return;
    info.textContent = 'Chargement…';
    fetch(BASE + 'textes/data/' + t.slug + '.txt').then(function (r) { return r.text(); }).then(function (txt) {
      area.value = txt; tIn.value = t.title; aIn.value = t.author;
      info.innerHTML = esc(t.title) + ', ' + esc(t.author) + ' (' + esc(t.published) + '). Source : <a href="' + esc(t.url) + '" rel="noopener">' + esc(t.source) + '</a>.';
      suggestSize();
    });
  }
  sel.addEventListener('change', pick);
  area.addEventListener('input', suggestSize);

  var sizeSel = $('#lp-taille');
  function words(s) { return s.split(/\s+/).filter(Boolean).length; }
  function suggestSize() {
    var n = words(area.value);
    $('#lp-mots').textContent = n ? nf(n) + ' mots' : '';
    if (!n) return;
    // About six parts: the closest preset (a class reads a short text in a few sittings).
    var best = null;
    $$('option', sizeSel).forEach(function (o) { var v = +o.value; if (best === null || Math.abs(n / v - 6) < Math.abs(n / best - 6)) best = v; });
    sizeSel.value = String(best);
  }

  // ---------------------------------------------------------------- segmentation
  var HEAD = /^\s*(?:(?:ACTE|Acte)\s+(?:[IVXLC]+|PREMIER|PREMIÈRE|SECOND|DEUXIÈME|TROISIÈME|QUATRIÈME|CINQUIÈME|[0-9]+)\b.*|(?:CHAPITRE|Chapitre)\s+(?:[IVXLC]+|[0-9]+|PREMIER)\b.*|(?:PREMIER|SECOND|DEUXIÈME|TROISIÈME|QUATRIÈME|CINQUIÈME|SIXIÈME)\s+SOIR\b.*|(?:Premier|Second|Deuxième|Troisième|Quatrième|Cinquième|Sixième)\s+soir\b.*|(?:LETTRE|Lettre)\s+[IVXLC]+\b.*|[IVXLC]{1,6}\.?)\s*$/;
  function units(text) {
    var out = [], cur = null;
    text.split('\n').forEach(function (line) {
      if (HEAD.test(line) && line.trim().length < 80) { cur = { id: 'u' + (out.length + 1), label: line.trim().replace(/\.$/, ''), lines: [] }; out.push(cur); }
      else if (cur) cur.lines.push(line);
    });
    return out.map(function (u) { return { id: u.id, label: u.label.charAt(0) + u.label.slice(1).toLowerCase(), text: u.lines.join('\n').trim() }; })
      .filter(function (u) { return words(u.text) >= 40; });
  }

  $('#lp-decouper').addEventListener('click', function () {
    var text = area.value.trim(), msg = $('#lp-decoupe-msg');
    msg.textContent = '';
    if (words(text) < 300) { msg.textContent = 'Il faut au moins 300 mots de texte.'; return; }
    if (words(text) > 250000) { msg.textContent = 'Le texte dépasse 250 000 mots : découpez-le en plusieurs fois.'; return; }
    state.text = text; state.title = tIn.value.trim() || 'Texte sans titre'; state.author = aIn.value.trim();
    var lang = E.detectTextLanguage(text);
    state.language = lang === 'en' ? 'en' : 'fr';
    state.mode = $('input[name="lp-mode"]:checked').value;
    state.size = +sizeSel.value;
    var segs = null;
    if (state.mode === 'titres') {
      var us = units(text);
      if (us.length >= 2 && us.length <= 60) segs = E.segmentUnits(us);
      else msg.textContent = 'Pas assez de titres reconnus (Acte, Chapitre, I, II…) : découpage par nombre de mots.';
    }
    if (!segs) { state.mode = 'words'; segs = E.segmentWholeText(text, state.size, 'Partie'); }
    if (segs.length > 60) { msg.textContent = 'Plus de 60 parties : choisissez des parties plus longues.'; return; }
    state.segments = segs;
    state.rows = segs.map(function (s) {
      var fb = E.fallbackCheckpoint(s, segs, state.language, state.title);
      return { segment: s.index + 1, question: fb ? fb.question : '', answer: fb ? fb.answer : '', evidence: fb ? fb.evidence : '', origin: 'fallback', autoEvidence: true };
    });
    render();
    goal('tool');
    $('#etape-3').hidden = false; $('#etape-4').hidden = false;
    $('#etape-3').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  // ---------------------------------------------------------------- cards
  var STARTERS = ['Qui ', 'Quel objet ', 'Où ', 'Comment s’appelle ', 'Que trouve '];
  function startEnd(s) {
    var w = s.text.split(' ');
    return { start: w.slice(0, 8).join(' '), end: w.slice(-8).join(' ') };
  }
  function render() {
    var list = $('#lp-parties');
    list.innerHTML = state.segments.map(function (s, i) {
      var r = state.rows[i], se = startEnd(s), cands = E.answerCandidates(s, state.segments, state.title).slice(0, 8);
      var from = state.segments.slice(0, i).reduce(function (n, x) { return n + x.wordCount; }, 0);
      return '<article class="partie" data-i="' + i + '" id="partie-' + (i + 1) + '">' +
        '<h3>' + esc(s.label) + ' <small>mots ' + nf(from + 1) + ' à ' + nf(from + s.wordCount) + ' · ' + nf(s.wordCount) + ' mots</small></h3>' +
        '<p class="bornes">Commence par « ' + esc(se.start) + ' … » et finit par « … ' + esc(se.end) + ' ».</p>' +
        '<details><summary>Passage de référence (mots ' + nf(from + s.analysisWindow.startWord) + ' à ' + nf(from + s.analysisWindow.endWord) + ')</summary>' +
        '<p class="fenetre">' + esc(s.analysisWindow.excerpt) + '</p></details>' +
        (cands.length ? '<p class="mots">Mots-réponses possibles (présents ici, absents des parties suivantes) : ' + cands.map(function (c) { return '<button type="button" class="chip" data-mot="' + esc(c) + '">' + esc(c) + '</button>'; }).join(' ') + '</p>' : '') +
        '<p class="modeles">Commencer la question par : ' + STARTERS.map(function (st) { return '<button type="button" class="chip ghost" data-debut="' + esc(st) + '">' + esc(st.trim()) + '…</button>'; }).join(' ') + '</p>' +
        '<label>Question<textarea rows="2" data-f="question" maxlength="300">' + esc(r.question) + '</textarea></label>' +
        '<div class="ligne"><label>Réponse (un mot)<input type="text" data-f="answer" maxlength="40" value="' + esc(r.answer) + '" autocomplete="off" spellcheck="false"></label>' +
        '<label class="grand">Passage du texte qui contient la réponse<textarea rows="2" data-f="evidence" maxlength="600">' + esc(r.evidence) + '</textarea></label></div>' +
        '<p class="origine">' + (r.origin === 'fallback' ? 'Modèle proposé par le moteur (texte à trous). Remplacez-le par votre question.' : 'Votre question.') + '</p>' +
        '<ul class="controles" aria-live="polite"></ul></article>';
    }).join('');
    check();
  }

  function sentenceWith(word, s) {
    var sentences = s.analysisWindow.excerpt.split(/(?<=[.!?;:…»])\s+/);
    for (var i = 0; i < sentences.length; i++) if (E.answerAppearsInText(word, sentences[i])) return sentences[i].trim();
    return '';
  }

  $('#lp-parties').addEventListener('input', function (e) {
    var card = e.target.closest('.partie'); if (!card) return;
    var i = +card.getAttribute('data-i'), r = state.rows[i], f = e.target.getAttribute('data-f');
    if (!f) return;
    r[f] = e.target.value;
    if (f === 'question') { r.origin = 'offline'; $('.origine', card).textContent = 'Votre question.'; }
    if (f === 'evidence') r.autoEvidence = false;
    if (f === 'answer' && r.autoEvidence) { r.evidence = sentenceWith(r.answer.trim(), state.segments[i]); $('[data-f="evidence"]', card).value = r.evidence; }
    check();
  });
  $('#lp-parties').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    var card = b.closest('.partie'), i = +card.getAttribute('data-i'), r = state.rows[i];
    if (b.hasAttribute('data-mot')) {
      r.answer = b.getAttribute('data-mot'); $('[data-f="answer"]', card).value = r.answer;
      r.autoEvidence = true; r.evidence = sentenceWith(r.answer, state.segments[i]); $('[data-f="evidence"]', card).value = r.evidence;
      if (r.origin === 'fallback') { r.question = ''; $('[data-f="question"]', card).value = ''; r.origin = 'offline'; $('.origine', card).textContent = 'Votre question.'; }
      $('[data-f="question"]', card).focus();
    } else if (b.hasAttribute('data-debut')) {
      var q = $('[data-f="question"]', card);
      r.question = b.getAttribute('data-debut') + (r.origin === 'fallback' ? '' : q.value.replace(/^\s+/, ''));
      r.origin = 'offline'; q.value = r.question; $('.origine', card).textContent = 'Votre question.';
      q.focus(); q.setSelectionRange(q.value.length, q.value.length);
    }
    check();
  });

  // ---------------------------------------------------------------- QA (engine rules, offline)
  var FR = {
    answer_in_unit: 'La réponse n’est pas un mot du passage de référence de cette partie.',
    evidence_in_unit: 'Le passage cité ne se trouve pas dans le texte de cette partie (vérifiez la copie).',
    evidence_missing: 'Ajoutez le passage du texte qui contient la réponse.',
    answer_in_evidence: 'Le passage cité ne contient pas la réponse telle quelle.',
    not_only_in_next: 'Cette réponse n’apparaît que dans la partie suivante : la question en dirait trop.',
    duplicate: 'Question trop proche de celle d’une autre partie.',
    'form:validator': 'Règle de génération de l’application : réponse d’un seul mot, précise, absente de la question, question de 35 à 160 caractères.',
    'form:true_false': 'Format vrai/faux : une question ouverte vérifie mieux la lecture.',
  };
  function check() {
    var segs = state.segments; if (!segs.length) return;
    var rows = [];
    state.rows.forEach(function (r) {
      if (r.question.trim() && r.answer.trim()) rows.push({ segment: r.segment, question: r.question.trim(), answer: r.answer.trim(), evidence: r.evidence.trim() || undefined });
    });
    var origin = new Map(state.rows.map(function (r) { return [r.segment, r.origin]; }));
    var file = E.buildCheckpoints({ title: state.title, author: state.author || null, language: state.language, segments: segs, rows: rows, origin: origin,
      mode: state.mode === 'titres' ? 'units' : 'words', segmentWordCount: state.mode === 'titres' ? null : state.size, allowPending: true, engineVersion: E.ENGINE_VERSION });
    state.file = file;
    var ready = 0;
    $$('.partie').forEach(function (card, i) {
      var r = state.rows[i], cp = file.checkpoints.filter(function (c) { return c.segment === i + 1; })[0], ul = $('.controles', card), items = [];
      if (!cp) {
        items.push('<li class="ko">Écrivez une question et sa réponse.</li>');
        card.classList.remove('pret');
      } else {
        var form = E.checkQuestion({ question: cp.question, answer: cp.answer, answerPage: 1, evidence: cp.evidence }, { language: state.language, range: null });
        var msg = function (id) {
          if (id.indexOf('form:') === 0) { var code = id.slice(5); var hit = form.results.filter(function (x) { return x.code === code; })[0]; if (hit) return hit.message; }
          if (id === 'answer_in_evidence') { var h = form.results.filter(function (x) { return x.code === 'evidence_contains_answer'; })[0]; if (h) return h.message; }
          if (id === 'answer_in_unit' && E.answerAppearsInText(cp.answer, state.segments[i].text)) return 'Ce mot est dans la partie, mais hors du passage de référence : prenez la réponse dans ce passage (ouvrez-le ci-dessus).';
          return FR[id] || id;
        };
        cp.failed.forEach(function (id) { items.push('<li class="ko">' + esc(msg(id)) + '</li>'); });
        cp.warnings.filter(function (id) { return id !== 'cold_answer'; }).forEach(function (id) { items.push('<li class="warn">' + esc(msg(id)) + '</li>'); });
        if (cp.ok) { ready += 1; items.unshift('<li class="ok">Point de contrôle prêt : forme, réponse présente dans le texte, pas de doublon.</li>'); }
        card.classList.toggle('pret', cp.ok);
      }
      ul.innerHTML = items.join('');
    });
    var integ = 'error' in file.integrity ? ' ' : '';
    $('#lp-bilan').innerHTML = '<strong>' + ready + ' sur ' + segs.length + '</strong> points de contrôle prêts.' + (ready < segs.length ? ' Les parties en rouge ont encore une règle à corriger.' : ' Vous pouvez imprimer ou exporter.') + integ;
  }

  // ---------------------------------------------------------------- exports
  function stamp() { return new Date().toISOString().slice(0, 10); }
  function slug(s) { return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'texte'; }
  function save(name, type, content) {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([content], { type: type }));
    a.download = name; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }
  function lines() {
    return state.segments.map(function (s, i) {
      var r = state.rows[i], cp = state.file && state.file.checkpoints.filter(function (c) { return c.segment === i + 1; })[0], se = startEnd(s);
      return { n: i + 1, label: s.label, start: se.start, end: se.end, words: s.wordCount, question: r.question.trim(), answer: r.answer.trim(), evidence: r.evidence.trim(),
        ok: !!(cp && cp.ok), failed: cp ? cp.failed.join(' ') : 'question manquante' };
    });
  }
  $('#lp-csv').addEventListener('click', function () {
    var q = function (v) { v = String(v == null ? '' : v); return /[;"\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
    var head = ['partie', 'libellé', 'début', 'fin', 'mots', 'question', 'réponse', 'passage', 'prêt', 'règles en échec'];
    var body = lines().map(function (l) { return [l.n, l.label, l.start, l.end, l.words, l.question, l.answer, l.evidence, l.ok ? 'oui' : 'non', l.failed].map(q).join(';'); });
    save('lectopoint-' + slug(state.title) + '-' + stamp() + '.csv', 'text/csv;charset=utf-8', '﻿' + [head.join(';')].concat(body).join('\r\n') + '\r\n');
    goal('download');
  });
  $('#lp-json').addEventListener('click', function () {
    check();
    var f = Object.assign({ generator: 'Lectopoint par READ FRANCE (https://outils.vread.fr/lectopoint/)' }, state.file);
    save('lectopoint-' + slug(state.title) + '-' + stamp() + '.checkpoints.json', 'application/json', JSON.stringify(f, null, 2) + '\n');
    goal('download');
  });
  $('#lp-imprimer').addEventListener('click', function () {
    var L = lines(), title = esc(state.title) + (state.author ? ', ' + esc(state.author) : '');
    $('#impression').innerHTML =
      '<section class="feuille"><h2>' + title + '</h2><p>Nom : ______________________ Classe : ________ Date : ____________</p>' +
      '<p class="consigne">Une question par partie. La réponse tient en un mot, et ce mot est dans le texte.</p><ol class="eleve">' +
      L.map(function (l) { return '<li><p class="repere">' + esc(l.label) + ' (de « ' + esc(l.start) + ' … » à « … ' + esc(l.end) + ' »)</p><p>' + esc(l.question || '(question à écrire)') + '</p><p class="trait">Réponse : ________________________</p></li>'; }).join('') +
      '</ol></section><section class="feuille corrige"><h2>Corrigé : ' + title + '</h2><ol>' +
      L.map(function (l) { return '<li><p>' + esc(l.question) + '</p><p><strong>' + esc(l.answer) + '</strong></p><p class="passage">« ' + esc(l.evidence) + ' »</p></li>'; }).join('') +
      '</ol><p class="pied">Préparé avec Lectopoint par READ FRANCE, outils.vread.fr/lectopoint</p></section>';
    goal('download');
    window.print();
  });
})();
