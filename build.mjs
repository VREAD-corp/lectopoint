// Builds the static site into dist/ (GitHub Pages, served at https://outils.vread.fr/lectopoint/).
// Inputs: src/assets (app, styles, the engine bundle, vendored mesure.js / cro.js), src/texts (public-domain texts).
// Env: SITE_BASE (default /lectopoint/), SITE_ORIGIN (default https://outils.vread.fr), OUT (default dist).
import { cpSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(ROOT, process.env.OUT || 'dist');
const BASE = process.env.SITE_BASE || '/lectopoint/';
const ORIGIN = process.env.SITE_ORIGIN || 'https://outils.vread.fr';
const TRACK_API = 'https://script.google.com/macros/s/AKfycbzD1IRL8QALluKGZxgGiORFP6-DkC_qFJYR9aOxZiimxa06nbCqpzUI-9iLblp6V2VY/exec';
const CONTACT = 'octave@vread.fr';
const UPDATED = '2026-10-16';
const PROV = JSON.parse(readFileSync(join(ROOT, 'src/assets/engine.provenance.json'), 'utf8'));
const TEXTS = JSON.parse(readFileSync(join(ROOT, 'src/texts/index.json'), 'utf8')).map((t) => ({
  ...t, words: readFileSync(join(ROOT, 'src/texts', t.slug + '.txt'), 'utf8').split(/\s+/).filter(Boolean).length,
}));

const u = (p = '') => BASE + p.replace(/^\//, '');
const abs = (p = '') => ORIGIN + u(p);
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const nf = (n) => n.toLocaleString('fr-FR').replace(/\u202f/g, '\u00a0');

/** French typography on text nodes only (never inside tags, scripts or styles): non-breaking spaces. */
function typo(html) {
  return html.split(/(<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<[^>]+>)/).map((part, i) => {
    if (i % 2) return part;
    return part.replace(/ ([:;?!»])/g, '\u00a0$1').replace(/« /g, '«\u00a0').replace(/(\d) €/g, '$1\u00a0€');
  }).join('');
}

const LOGO = `<svg viewBox="0 0 32 32" width="28" height="28" aria-hidden="true"><rect x="4" y="4" width="24" height="24" rx="4" fill="#FAF7F1" stroke="#2B2620" stroke-width="2"/><path d="M9 11h14M9 16h9M9 21h6" stroke="#2B2620" stroke-width="1.8" stroke-linecap="round"/><circle cx="23" cy="21" r="3.2" fill="#1F5C4C"/></svg>`;
const ORG = { '@type': 'Organization', '@id': 'https://outils.vread.fr/#org', name: 'READ FRANCE SAS', legalName: 'READ FRANCE', url: 'https://outils.vread.fr/', email: CONTACT,
  address: { '@type': 'PostalAddress', streetAddress: '11 rue Rouvet', postalCode: '75019', addressLocality: 'Paris', addressCountry: 'FR' } };
const NAV = [['', 'L’outil'], ['methode/', 'La méthode'], ['textes/', 'Les textes']];
const CSP = `default-src 'self'; script-src 'self'; connect-src 'self' https://script.google.com https://script.googleusercontent.com; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; font-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'`;

function layout(pg) {
  const canonical = abs(pg.path);
  const nav = NAV.map(([p, t]) => `<li><a href="${u(p)}"${p === pg.path ? ' aria-current="page"' : ''}>${t}</a></li>`).join('');
  const ld = pg.ld ? `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@graph': [ORG, ...pg.ld] }).replace(/</g, '\\u003c')}</script>\n` : '';
  return typo(`<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="${CSP}">
<title>${esc(pg.title)}</title>
<meta name="description" content="${esc(pg.description)}">
${pg.noindex ? '<meta name="robots" content="noindex">\n' : `<link rel="canonical" href="${canonical}">\n`}<meta property="og:type" content="website">
<meta property="og:locale" content="fr_FR">
<meta property="og:site_name" content="Lectopoint par READ FRANCE">
<meta property="og:title" content="${esc(pg.title)}">
<meta property="og:description" content="${esc(pg.description)}">
<meta property="og:url" content="${canonical}">
<link rel="icon" href="${u('assets/favicon.svg')}" type="image/svg+xml">
<link rel="stylesheet" href="${u('assets/style.css')}">
<script src="${u('assets/xp.js')}"></script>
<script src="${u('cro.js')}" data-site="lectopoint" data-api="${TRACK_API}" data-hosts="outils.vread.fr" data-cta="[data-mesure], .btn"></script>
<script src="${u('mesure.js')}" defer></script>
${ld}</head>
<body>
<a class="skip" href="#main">Aller au contenu</a>
<header class="site"><div class="wrap">
<a class="brand" href="${u('')}">${LOGO}<span>Lectopoint<small>par READ FRANCE</small></span></a>
<nav aria-label="Principale"><ul>${nav}</ul></nav>
</div></header>
<main id="main"><div class="wrap">
${pg.body}
</div></main>
<footer class="site"><div class="wrap">
<p><strong>Lectopoint</strong> est une activité de READ FRANCE, l’éditeur de Vread. READ FRANCE SAS, 11 rue Rouvet, 75019 Paris. Contact : <a href="mailto:${CONTACT}">${CONTACT}</a>.</p>
<p>Outil gratuit, sans compte. Ressource privée, sans lien avec le ministère de l’Éducation nationale.</p>
<ul><li><a href="${u('textes/')}">Textes et droits</a></li><li><a href="${u('confidentialite/')}">Confidentialité</a></li><li><a href="${u('mentions-legales/')}">Mentions légales</a></li><li><a href="https://outils.vread.fr/lectoguide/">Lectoguide, les fiches de lecture</a></li></ul>
</div></footer>
${pg.scripts || ''}<div id="impression" aria-hidden="true"></div>
</body>
</html>
`);
}

const pages = [];
const LINKS = {
  lectoclasse: 'https://outils.vread.fr/lectoclasse/',
  lectoclasseFree: 'https://outils.vread.fr/lectoclasse/echantillon/',
  chapterChecks: 'https://outils.vread.fr/chapter-checks/',
  ecoles: 'https://www.vread.fr/ecoles',
  lectoguide: 'https://outils.vread.fr/lectoguide/',
};

const renvois = `<h2 id="kits">Besoin de contrôles déjà rédigés ?</h2>
<div class="renvois">
<div class="renvoi"><h3><a href="${LINKS.lectoclasse}" data-mesure="cta_click">Lectoclasse</a></h3><p>Kits de lecture prêts à imprimer sur les œuvres du domaine public du bac de français (épreuve de juin 2027) : questions par acte ou par chapitre, corrigés, fiche d’oral. Vendus aux établissements hors Union européenne.</p><p><a href="${LINKS.lectoclasseFree}" data-mesure="cta_click">Le kit complet du Menteur de Corneille est gratuit pour tous.</a></p></div>
<div class="renvoi"><h3><a href="${LINKS.chapterChecks}" data-mesure="cta_click">Chapter Checks</a></h3><p>Le même travail en anglais pour les classiques étudiés en AP Literature : contrôles de lecture par chapitre, corrigés, imports pour les plateformes de classe. Un pack gratuit sur Macbeth.</p></div>
<div class="renvoi"><h3><a href="${LINKS.ecoles}" data-mesure="cta_click">Vread pour les écoles</a></h3><p>Pour suivre une classe livre par livre dans l’application, avec un point de contrôle toutes les 30 à 40 pages, plutôt qu’avec une fiche papier.</p></div>
</div>`;

pages.push({
  path: '',
  title: 'Lectopoint : points de contrôle de lecture à imprimer, gratuit',
  description: 'Collez un texte du domaine public ou choisissez un classique : Lectopoint le découpe en parties, propose un point de contrôle par partie et vérifie vos questions. Sans envoi, sans compte.',
  ld: [{ '@type': 'WebApplication', name: 'Lectopoint par READ FRANCE', url: abs(''), applicationCategory: 'EducationalApplication', operatingSystem: 'Navigateur web',
    inLanguage: 'fr', isAccessibleForFree: true, offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' }, publisher: { '@id': ORG['@id'] }, audience: { '@type': 'EducationalAudience', educationalRole: 'teacher' },
    description: 'Outil gratuit pour enseignants : découpage d’un texte en parties, un point de contrôle de lecture par partie (question ouverte, réponse d’un mot présente dans le texte), règles de forme vérifiées dans le navigateur, export imprimable ou CSV.' }],
  body: `<h1 data-xp-titre>Des points de contrôle de lecture pour votre classe, prêts à imprimer</h1>
<p class="lead">Choisissez un texte, Lectopoint le découpe en parties et propose un point de contrôle par partie : une question ouverte dont la réponse tient en un mot, un mot qui figure dans la partie lue. Vous écrivez ou corrigez les questions, l’outil vérifie les règles au fur et à mesure, puis vous imprimez la fiche élève et son corrigé.</p>
<p class="muted">Tout se passe dans votre navigateur. Le texte, les questions et les réponses ne sont envoyés nulle part. Il n’y a ni compte, ni élève à inscrire.</p>
<div id="outil" data-base="${BASE}">
<section class="etape" id="etape-1"><h2><span>1</span>Le texte</h2>
<label for="lp-texte">Un classique du domaine public</label>
<select id="lp-texte"><option value="">Choisir un texte…</option></select>
<p class="small" id="lp-texte-info"></p>
<label for="lp-colle">Ou collez votre texte (domaine public, ou un texte que vous avez le droit d’utiliser en classe)</label>
<textarea id="lp-colle" spellcheck="false" placeholder="Collez ici le texte, avec ses titres de chapitres ou d’actes s’il en a."></textarea>
<p class="small" id="lp-mots" aria-live="polite"></p>
<div class="deux"><label>Titre<input type="text" id="lp-titre" maxlength="120"></label><label>Auteur<input type="text" id="lp-auteur" maxlength="120"></label></div>
</section>
<section class="etape" id="etape-2"><h2><span>2</span>Le découpage</h2>
<fieldset><legend>Couper le texte</legend>
<label class="radio"><input type="radio" name="lp-mode" value="words" checked> toutes les
<select id="lp-taille" aria-label="Taille d’une partie" style="display:inline-block;width:auto;margin:0 6px"><option value="500">500</option><option value="1000" selected>1 000</option><option value="1500">1 500</option><option value="3000">3 000</option><option value="5000">5 000</option><option value="10000">10 000</option></select> mots</label>
<label class="radio"><input type="radio" name="lp-mode" value="titres"> sur les titres du texte (Acte, Chapitre, I, II…)</label>
</fieldset>
<p class="small">10 000 mots, c’est le rythme de l’application Vread : environ un point de contrôle toutes les 30 à 40 pages. Pour une nouvelle lue en classe, 500 à 1 000 mots par partie conviennent mieux.</p>
<div class="actions"><button type="button" class="btn" id="lp-decouper" data-mesure="tool_use">Proposer les parties</button><span class="msg" id="lp-decoupe-msg" aria-live="polite"></span></div>
</section>
<section class="etape" id="etape-3" hidden><h2><span>3</span>Les points de contrôle</h2>
<p class="small">Pour chaque partie, le moteur propose un modèle (un texte à trous pris dans le passage de référence) et des mots-réponses possibles. Remplacez le modèle par votre question : qui, quel objet, quel lieu, quel nom. Les règles sont vérifiées à chaque frappe.</p>
<p id="lp-bilan" aria-live="polite"></p>
<div id="lp-parties"></div>
</section>
<section class="etape" id="etape-4" hidden><h2><span>4</span>Imprimer ou exporter</h2>
<div class="actions">
<button type="button" class="btn" id="lp-imprimer" data-mesure="free_download">Imprimer la fiche élève et le corrigé</button>
<button type="button" class="btn second" id="lp-csv" data-mesure="free_download">Télécharger le tableau (CSV)</button>
<button type="button" class="btn second" id="lp-json" data-mesure="free_download">Fichier du moteur (JSON)</button>
</div>
<p class="small">Le CSV s’ouvre dans un tableur (séparateur point-virgule). Le JSON suit le format read-france.checkpoints/1 du moteur de lecture de READ FRANCE.</p>
</section>
</div>
<h2>Ce que l’outil vérifie, et ce qu’il ne vérifie pas</h2>
<p>Il vérifie la forme de chaque question (35 à 160 caractères, un point d’interrogation, pas de question fermée en oui ou non, pas de choix multiple), la réponse (un seul mot, ni générique comme « maison » ou « roi », absent de la question, présent dans le passage de référence de la partie), le passage cité et les questions trop proches d’une partie à l’autre. Ce sont les règles qui servent à écrire les questions de l’application Vread.</p>
<p>Il ne vérifie pas qu’une question est impossible à deviner sans avoir lu : pour cela, faites-la lire à un collègue qui ne connaît pas le texte. S’il trouve la réponse, changez de détail. <a href="${u('methode/')}">La méthode en détail</a>.</p>
${renvois}`,
  scripts: `<script src="${u('assets/engine.js')}"></script>\n<script src="${u('assets/app.js')}"></script>\n`,
});

pages.push({
  path: 'methode/',
  title: 'La méthode Lectopoint : une question par partie, une réponse d’un mot',
  description: 'Les règles des points de contrôle de lecture de Lectopoint : découpage, passage de référence, question ouverte, réponse d’un mot présente dans le texte, contrôles automatiques et leurs limites.',
  ld: [{ '@type': 'WebPage', name: 'La méthode Lectopoint', url: abs('methode/'), inLanguage: 'fr', dateModified: UPDATED, publisher: { '@id': ORG['@id'] } }],
  body: `<h1>Une question par partie, une réponse d’un mot</h1>
<p class="lead">Lectopoint applique au papier la méthode des points de contrôle de l’application Vread : on avance dans le texte partie par partie, et chaque partie se valide par une question précise sur ce qui vient d’être lu.</p>
<h2>Le découpage</h2>
<p>Le texte est coupé tous les N mots, ou sur ses propres titres (actes, chapitres, chiffres romains). Le découpeur est celui du moteur de lecture de READ FRANCE, écrit en janvier 2026 pour Vread : dans chaque partie, il retient un passage de référence d’environ 800 mots, au milieu de la partie (ou toute la partie si elle est courte). La question du point de contrôle porte sur ce passage. Ainsi, elle ne tombe ni sur la première page, que tout le monde lit, ni sur la dernière.</p>
<h2>La question</h2>
<ol class="regles">
<li>Une question ouverte : qui, quoi, où, comment s’appelle, combien. Pas de oui ou non, pas de liste de réponses à cocher.</li>
<li>De 35 à 160 caractères, terminée par un point d’interrogation.</li>
<li>La réponse tient en un seul mot, sans espace : un nom, un objet, un lieu. Un trait d’union ou une apostrophe sont acceptés.</li>
<li>Ce mot figure tel quel dans le passage de référence. Les accents, les majuscules et l’article élidé (« l’épée ») ne comptent pas.</li>
<li>Il n’est pas dans la question, et ce n’est pas un mot passe-partout (homme, femme, jour, maison, roi, lettre, amour…).</li>
<li>Il n’apparaît pas seulement dans la partie suivante : la question ne doit rien dévoiler de la suite.</li>
<li>Deux parties n’ont pas la même question en d’autres mots.</li>
</ol>
<p>Ces règles viennent des outils internes de Vread (le générateur de questions et la plateforme où des lecteurs rédigent des questions), extraits en octobre 2026 dans le moteur de lecture de READ FRANCE. Lectopoint en embarque une copie qui tourne dans le navigateur : ${PROV.files.length} fichiers du moteur, version ${esc(PROV.commit.slice(0, 7))}.</p>
<h2>Les mots-réponses proposés</h2>
<p>Pour chaque partie, le moteur liste des mots de quatre lettres ou plus présents dans le passage de référence et absents de toutes les parties suivantes, en commençant par ceux qu’on n’a pas encore rencontrés et par les noms propres. Il propose aussi un modèle de question à trous. C’est un point de départ : une question écrite par l’enseignant, sur un détail qui compte dans l’histoire, vaut mieux.</p>
<h2>Les limites</h2>
<ul>
<li>L’outil ne sait pas si une question se devine sans lire. Sur un texte très connu, beaucoup de détails sont dans les résumés : testez la question sur quelqu’un qui n’a pas lu le texte.</li>
<li>Une réponse d’un mot vérifie qu’on a lu le passage, pas qu’on l’a compris en profondeur. Pour l’interprétation, il faut d’autres questions, à l’écrit ou à l’oral.</li>
<li>Le découpage par titres reconnaît les intitulés courants (Acte, Chapitre, I, II…). Si le texte n’en a pas, il est coupé par nombre de mots.</li>
</ul>
${renvois}`,
});

pages.push({
  path: 'textes/',
  title: 'Les textes de Lectopoint : classiques du domaine public et sources',
  description: 'Les textes proposés dans Lectopoint, leurs sources (Wikisource) et leur statut : auteurs morts avant 1925, texte original, transcription sous licence CC BY-SA 4.0.',
  ld: [{ '@type': 'ItemList', name: 'Textes du domaine public proposés dans Lectopoint', itemListElement: TEXTS.map((t, i) => ({ '@type': 'ListItem', position: i + 1, item: { '@type': 'CreativeWork', name: t.title, author: { '@type': 'Person', name: t.author }, datePublished: String(t.published).slice(0, 4), inLanguage: 'fr' } })) }],
  body: `<h1>Les textes proposés</h1>
<p class="lead">${TEXTS.length} textes français du domaine public, en version originale, repris de Wikisource. Chaque auteur est mort avant 1925 : ces textes sont libres en France, aux États-Unis et dans les autres pays où nous pourrions être lus.</p>
<div class="table-wrap"><table class="t"><thead><tr><th>Texte</th><th>Auteur</th><th>Mots</th><th>Niveau courant</th><th>Source</th></tr></thead><tbody>
${TEXTS.map((t) => `<tr><td><a href="${u('?texte=' + t.slug)}">${esc(t.title)}</a> (${esc(t.published)})</td><td>${esc(t.author)} (${esc(t.authorDates)})</td><td>${nf(t.words)}</td><td>${esc(t.level)}</td><td><a href="${esc(t.url)}" rel="noopener">${esc(t.source)}</a></td></tr>`).join('\n')}
</tbody></table></div>
<p>Les transcriptions de Wikisource sont publiées sous licence <a href="https://creativecommons.org/licenses/by-sa/4.0/deed.fr" rel="noopener">CC BY-SA 4.0</a> : si vous redistribuez un texte, citez Wikisource. Nous n’avons retouché que la mise en page (titres de navigation retirés, numéros de paragraphes supprimés).</p>
<p>Vous pouvez aussi coller votre propre texte dans l’outil. Il reste dans votre navigateur : vérifiez seulement que vous avez le droit de l’utiliser en classe.</p>`,
});

pages.push({
  path: 'confidentialite/',
  title: 'Confidentialité : Lectopoint par READ FRANCE',
  description: 'Lectopoint ne reçoit ni le texte, ni les questions, ni les réponses. La mesure d’audience est agrégée, sans cookie ni identifiant.',
  body: `<h1>Confidentialité</h1>
<p class="lead">Le texte que vous collez ou choisissez, vos questions et vos réponses restent dans votre navigateur. Lectopoint ne les envoie à aucun serveur et ne les conserve pas : fermez l’onglet et ils disparaissent.</p>
<h2>Mesure d’audience</h2>
<p>Pour savoir si l’outil sert, nous comptons de façon agrégée, par jour et par page : les pages vues, les clics sur « Proposer les parties », les exports (impression, CSV, JSON), les clics vers les autres ressources de READ FRANCE, la profondeur de lecture de la page, le temps avant le premier clic par tranche, les erreurs techniques et les indicateurs de vitesse. Pour le test du titre de la page, nous comptons quelle version a été affichée.</p>
<p>Ces compteurs ne contiennent ni cookie, ni adresse IP, ni identifiant, ni ce que vous tapez. Le navigateur envoie seulement le nom du site, la page, l’événement, le domaine du site d’où vous venez, d’éventuels paramètres de campagne (utm) et le type d’écran (mobile ou ordinateur). Le stockage de session du navigateur garde, le temps de l’onglet, la version du test affichée. Si votre navigateur envoie le signal « Do Not Track » ou « Global Privacy Control », rien n’est envoyé.</p>
<p>Les compteurs sont enregistrés dans un tableur Google de READ FRANCE (Google Apps Script). Cette mesure est exemptée de consentement au sens des lignes directrices de la CNIL sur les traceurs, parce qu’elle est strictement limitée à des statistiques anonymes du site.</p>
<h2>Contact</h2>
<p>READ FRANCE SAS, 11 rue Rouvet, 75019 Paris. <a href="mailto:${CONTACT}">${CONTACT}</a>. Vous pouvez aussi saisir la CNIL (cnil.fr).</p>
<p class="small">Mise à jour : 16 octobre 2026.</p>`,
});

pages.push({
  path: 'mentions-legales/',
  title: 'Mentions légales : Lectopoint par READ FRANCE',
  description: 'Éditeur, hébergeur et conditions d’utilisation de Lectopoint, outil gratuit de READ FRANCE SAS pour préparer des points de contrôle de lecture.',
  body: `<h1>Mentions légales</h1>
<p>Éditeur : READ FRANCE SAS, 11 rue Rouvet, 75019 Paris, RCS Paris 988 741 773. Directeur de la publication : le président de la société. Contact : <a href="mailto:${CONTACT}">${CONTACT}</a>.</p>
<p>Hébergeur : GitHub Pages, GitHub, Inc., 88 Colin P. Kelly Jr. Street, San Francisco, CA 94107, États-Unis.</p>
<h2>Utilisation</h2>
<p>Lectopoint est gratuit et fourni tel quel. Les questions que vous rédigez vous appartiennent. Vérifiez les fiches avant de les distribuer : l’outil contrôle la forme et la présence de la réponse dans le texte, pas la justesse pédagogique d’une question.</p>
<p>Le code de la page et le moteur de lecture qu’elle embarque sont la propriété de READ FRANCE SAS. Les textes proposés sont dans le domaine public ; leurs transcriptions viennent de Wikisource (CC BY-SA 4.0).</p>
<p>Lectopoint est une ressource privée, sans lien avec le ministère de l’Éducation nationale.</p>`,
});

pages.push({
  path: '404.html', noindex: true,
  title: 'Page introuvable : Lectopoint',
  description: 'Cette page de Lectopoint n’existe pas. Retournez à l’outil pour préparer des points de contrôle de lecture.',
  body: `<h1>Page introuvable</h1><p><a href="${u('')}">Retour à l’outil</a></p>`,
});

// ------------------------------------------------------------------------------------------------ write
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
for (const pg of pages) {
  const f = join(OUT, pg.path.endsWith('.html') ? pg.path : join(pg.path, 'index.html'));
  mkdirSync(dirname(f), { recursive: true });
  writeFileSync(f, layout(pg));
}
cpSync(join(ROOT, 'src/assets'), join(OUT, 'assets'), { recursive: true });
for (const f of ['mesure.js', 'cro.js']) cpSync(join(ROOT, 'src/assets', f), join(OUT, f));
mkdirSync(join(OUT, 'textes/data'), { recursive: true });
for (const t of TEXTS) cpSync(join(ROOT, 'src/texts', t.slug + '.txt'), join(OUT, 'textes/data', t.slug + '.txt'));
writeFileSync(join(OUT, 'textes/data/index.json'), JSON.stringify(TEXTS) + '\n');
writeFileSync(join(OUT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages.filter((p) => !p.noindex).map((p) => `  <url><loc>${abs(p.path)}</loc><lastmod>${UPDATED}</lastmod></url>`).join('\n')}\n</urlset>\n`);
writeFileSync(join(OUT, '.nojekyll'), '');
console.log(`dist: ${pages.length} pages, ${TEXTS.length} texts`);
