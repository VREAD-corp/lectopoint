/*! READ FRANCE reading engine, browser bundle for Lectopoint. © 2026 READ FRANCE SAS, proprietary (VREAD-corp/vread-reading-engine@e79976f). Segmenter and QA rules from vread-workflow-def a5df9a9 (Vincent Cance); provenance: engine.provenance.json */
var ReadingEngine = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
  var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

  // tools/engine-entry.ts
  var engine_entry_exports = {};
  __export(engine_entry_exports, {
    CHECKPOINT_FORMAT: () => CHECKPOINT_FORMAT,
    DEFAULT_SEGMENT_WORDS: () => DEFAULT_SEGMENT_WORDS,
    DUPLICATE_THRESHOLD: () => DUPLICATE_THRESHOLD,
    ENGINE_VERSION: () => ENGINE_VERSION,
    GENERIC_ANSWERS: () => GENERIC_ANSWERS,
    QUESTION_MAX_LENGTH: () => QUESTION_MAX_LENGTH,
    QUESTION_MIN_LENGTH: () => QUESTION_MIN_LENGTH,
    answerAppearsInText: () => answerAppearsInText,
    answerCandidates: () => answerCandidates,
    buildCheckpoints: () => buildCheckpoints,
    buildWordSet: () => buildWordSet,
    checkQuestion: () => checkQuestion,
    checkpointsOk: () => checkpointsOk,
    detectTextLanguage: () => detectTextLanguage,
    fallbackCheckpoint: () => fallbackCheckpoint,
    findDuplicates: () => findDuplicates,
    isYesNoQuestion: () => isYesNoQuestion,
    matchEvidence: () => matchEvidence,
    runQa: () => runQa,
    segmentText: () => segmentText,
    segmentUnits: () => segmentUnits,
    segmentWholeText: () => segmentWholeText,
    similarity: () => similarity,
    validateQuestion: () => validateQuestion
  });

  // ../vread-reading-engine/src/ingest/segmenter.ts
  var DEFAULT_SEGMENT_WORDS = 1e4;
  var DEFAULT_WINDOW_START = 4500;
  var DEFAULT_WINDOW_END = 5300;
  var normalizeWords = (text) => text.replace(/\s+/g, " ").replace(/\u00a0/g, " ").trim().split(" ").filter(Boolean);
  var buildAnalysisWindow = (words, start, end) => {
    const safeStart = Math.max(0, Math.min(words.length - 1, start));
    const safeEnd = Math.max(safeStart + 1, Math.min(words.length, end));
    return {
      startWord: safeStart + 1,
      endWord: safeEnd,
      excerpt: words.slice(safeStart, safeEnd).join(" ")
    };
  };
  var buildCenteredWindow = (words) => {
    if (words.length === 0) {
      return { startWord: 1, endWord: 1, excerpt: "" };
    }
    const minWindow = 700;
    const maxWindow = 900;
    const windowSize = Math.min(maxWindow, Math.max(minWindow, words.length));
    const mid = Math.floor(words.length / 2);
    const start = Math.max(0, mid - Math.floor(windowSize / 2));
    const end = Math.min(words.length, start + windowSize);
    return {
      startWord: start + 1,
      endWord: end,
      excerpt: words.slice(start, end).join(" ")
    };
  };
  var segmentText = (text, options = {}) => {
    const words = normalizeWords(text);
    if (words.length === 0) {
      return [];
    }
    const segmentSize = options.segmentWordCount ?? DEFAULT_SEGMENT_WORDS;
    const segments = [];
    for (let startIndex = 0; startIndex < words.length; startIndex += segmentSize) {
      const segmentWords = words.slice(startIndex, startIndex + segmentSize);
      const wordCount = segmentWords.length;
      const analysisWindow = wordCount < DEFAULT_WINDOW_END ? buildCenteredWindow(segmentWords) : buildAnalysisWindow(segmentWords, DEFAULT_WINDOW_START, DEFAULT_WINDOW_END);
      segments.push({
        index: segments.length,
        wordCount,
        text: segmentWords.join(" "),
        analysisWindow
      });
    }
    return segments;
  };

  // tools/shims/crypto.js
  var utf8 = (s) => new TextEncoder().encode(s);
  var rotl = (x, n) => x << n | x >>> 32 - n;
  var rotr = (x, n) => x >>> n | x << 32 - n;
  function pad(bytes) {
    const len = bytes.length, bits = len * 8, total = len + 9 + 63 >> 6 << 6;
    const m = new Uint8Array(total);
    m.set(bytes);
    m[len] = 128;
    const dv = new DataView(m.buffer);
    dv.setUint32(total - 4, bits >>> 0);
    dv.setUint32(total - 8, Math.floor(bits / 2 ** 32));
    return dv;
  }
  var hex = (words) => words.map((w) => (w >>> 0).toString(16).padStart(8, "0")).join("");
  function sha1(bytes) {
    const dv = pad(bytes);
    let h = [1732584193, 4023233417, 2562383102, 271733878, 3285377520];
    const w = new Array(80);
    for (let o = 0; o < dv.byteLength; o += 64) {
      for (let i = 0; i < 16; i++) w[i] = dv.getUint32(o + i * 4);
      for (let i = 16; i < 80; i++) w[i] = rotl(w[i - 3] ^ w[i - 8] ^ w[i - 14] ^ w[i - 16], 1);
      let [a, b, c, d, e] = h;
      for (let i = 0; i < 80; i++) {
        const f = i < 20 ? b & c | ~b & d : i < 40 ? b ^ c ^ d : i < 60 ? b & c | b & d | c & d : b ^ c ^ d;
        const k = i < 20 ? 1518500249 : i < 40 ? 1859775393 : i < 60 ? 2400959708 : 3395469782;
        const t = rotl(a, 5) + f + e + k + w[i] | 0;
        e = d;
        d = c;
        c = rotl(b, 30);
        b = a;
        a = t;
      }
      h = [h[0] + a, h[1] + b, h[2] + c, h[3] + d, h[4] + e].map((x) => x | 0);
    }
    return hex(h);
  }
  var K = [1116352408, 1899447441, 3049323471, 3921009573, 961987163, 1508970993, 2453635748, 2870763221, 3624381080, 310598401, 607225278, 1426881987, 1925078388, 2162078206, 2614888103, 3248222580, 3835390401, 4022224774, 264347078, 604807628, 770255983, 1249150122, 1555081692, 1996064986, 2554220882, 2821834349, 2952996808, 3210313671, 3336571891, 3584528711, 113926993, 338241895, 666307205, 773529912, 1294757372, 1396182291, 1695183700, 1986661051, 2177026350, 2456956037, 2730485921, 2820302411, 3259730800, 3345764771, 3516065817, 3600352804, 4094571909, 275423344, 430227734, 506948616, 659060556, 883997877, 958139571, 1322822218, 1537002063, 1747873779, 1955562222, 2024104815, 2227730452, 2361852424, 2428436474, 2756734187, 3204031479, 3329325298];
  function sha256(bytes) {
    const dv = pad(bytes);
    let h = [1779033703, 3144134277, 1013904242, 2773480762, 1359893119, 2600822924, 528734635, 1541459225];
    const w = new Array(64);
    for (let o = 0; o < dv.byteLength; o += 64) {
      for (let i = 0; i < 16; i++) w[i] = dv.getUint32(o + i * 4);
      for (let i = 16; i < 64; i++) {
        const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ w[i - 15] >>> 3, s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ w[i - 2] >>> 10;
        w[i] = w[i - 16] + s0 + w[i - 7] + s1 | 0;
      }
      let [a, b, c, d, e, f, g, hh] = h;
      for (let i = 0; i < 64; i++) {
        const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25), ch = e & f ^ ~e & g, t1 = hh + S1 + ch + K[i] + w[i] | 0;
        const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22), mj = a & b ^ a & c ^ b & c, t2 = S0 + mj | 0;
        hh = g;
        g = f;
        f = e;
        e = d + t1 | 0;
        d = c;
        c = b;
        b = a;
        a = t1 + t2 | 0;
      }
      h = [h[0] + a, h[1] + b, h[2] + c, h[3] + d, h[4] + e, h[5] + f, h[6] + g, h[7] + hh].map((x) => x | 0);
    }
    return hex(h);
  }
  function createHash(alg) {
    let data = "";
    const api = { update(s) {
      data += String(s);
      return api;
    }, digest(enc) {
      if (enc !== "hex") throw new Error("crypto shim: hex digest only");
      if (alg === "sha1") return sha1(utf8(data));
      if (alg === "sha256") return sha256(utf8(data));
      throw new Error("crypto shim: " + alg);
    } };
    return api;
  }

  // tools/shims/prompts-build.js
  var buildGenerationPrompt = (metadata) => {
    const lang = String(metadata.language || "fr").toLowerCase().slice(0, 2);
    return { version: lang === "fr" ? "engine:v4" : "engine:v4-en", system: "", user: "" };
  };

  // ../vread-reading-engine/src/qa/cold-answer.ts
  var normalizeAnswer = (value) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/^(l|d|n)'/, "").replace(/^(le|la|les|un|une|des|the|a|an)\s+/, "").replace(/[^a-z0-9]/g, "").trim();
  var isColdAnswerable = (expected, coldAnswer) => {
    const a = normalizeAnswer(expected);
    const b = normalizeAnswer(coldAnswer);
    if (!a || !b) return false;
    return a === b;
  };

  // ../vread-reading-engine/src/qa/answer-presence.ts
  var APOSTROPHES = /[’‘ʼ´`]/g;
  var tokenForms = (token) => {
    const forms = [token];
    const parts = token.split(/['\-‐‑–]/);
    if (parts.length > 1) forms.push(...parts);
    return forms;
  };
  var buildWordSet = (text) => {
    const words = /* @__PURE__ */ new Set();
    for (const raw of text.replace(APOSTROPHES, "'").split(/\s+/)) {
      if (!raw) continue;
      for (const form of tokenForms(raw)) {
        const normalized = normalizeAnswer(form);
        if (normalized) words.add(normalized);
      }
    }
    return words;
  };
  var normalizeAnswerForPresence = (answer) => normalizeAnswer(answer.trim().replace(APOSTROPHES, "'"));
  var answerAppearsInText = (answer, text) => {
    const needle = normalizeAnswerForPresence(answer);
    if (!needle) return false;
    const words = typeof text === "string" ? buildWordSet(text) : text;
    return words.has(needle);
  };

  // ../vread-reading-engine/src/qa/integrity.ts
  var IntegrityError = class extends Error {
    constructor(message, report) {
      super(message);
      __publicField(this, "report");
      this.name = "IntegrityError";
      this.report = report;
    }
  };
  var assertGenerationIntegrity = (params) => {
    const { parsedSegmentsLength } = params;
    const questions = params.questions.map((q) => ({ segmentIndex: q.segment - 1, answer: q.answer }));
    const segmentsByIndex = /* @__PURE__ */ new Map();
    const multiWordAnswers = [];
    for (const q of questions) {
      segmentsByIndex.set(q.segmentIndex, (segmentsByIndex.get(q.segmentIndex) ?? 0) + 1);
      if (/\s/.test(q.answer.trim())) {
        multiWordAnswers.push({
          segment: q.segmentIndex + 1,
          answer: q.answer.length > 60 ? q.answer.slice(0, 60) + "…" : q.answer
        });
      }
    }
    const missingSegments = [];
    for (let i = 0; i < parsedSegmentsLength; i += 1) {
      if (!segmentsByIndex.has(i)) missingSegments.push(i + 1);
    }
    const extraSegments = [];
    const duplicatedSegments = [];
    for (const [segmentIndex, count] of segmentsByIndex) {
      if (segmentIndex >= parsedSegmentsLength || segmentIndex < 0) {
        extraSegments.push(segmentIndex + 1);
      }
      if (count > 1) duplicatedSegments.push(segmentIndex + 1);
    }
    extraSegments.sort((a, b) => a - b);
    duplicatedSegments.sort((a, b) => a - b);
    const report = {
      totalSegments: parsedSegmentsLength,
      questionCount: questions.length,
      segmentsCovered: segmentsByIndex.size,
      missingSegments,
      extraSegments,
      duplicatedSegments,
      multiWordAnswers
    };
    const errors = [];
    if (parsedSegmentsLength <= 0) errors.push("NO_PARSED_SEGMENTS");
    if (questions.length === 0) errors.push("NO_QUESTIONS_PARSED");
    if (missingSegments.length > 0) errors.push(`MISSING_SEGMENTS:${missingSegments.join(",")}`);
    if (extraSegments.length > 0) errors.push(`EXTRA_SEGMENTS:${extraSegments.join(",")}`);
    if (duplicatedSegments.length > 0) errors.push(`DUPLICATE_SEGMENTS:${duplicatedSegments.join(",")}`);
    if (multiWordAnswers.length > 0) {
      errors.push(`MULTI_WORD_ANSWERS:${multiWordAnswers.map((m) => m.segment).join(",")}`);
    }
    if (errors.length > 0) {
      throw new IntegrityError(`Integrity check failed: ${errors.join("; ")}`, report);
    }
    return report;
  };

  // ../vread-reading-engine/src/qa/question-rules.ts
  var QUESTION_MIN_LENGTH = 35;
  var QUESTION_MAX_LENGTH = 160;
  var ANSWER_MIN_LENGTH = 2;
  var ANSWER_MAX_LENGTH = 40;
  var normalizeWord = (value) => value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[’‘ʼ´`]/g, "'").replace(/^(l|d|n)'/, "").replace(/^(le|la|les|un|une|des|the|a|an)\s+/, "").replace(/[^a-z0-9]/g, "").trim();
  var wordSet = (text) => {
    const words = /* @__PURE__ */ new Set();
    for (const raw of text.replace(/[’‘ʼ´`]/g, "'").split(/\s+/)) {
      if (!raw) continue;
      const forms = [raw, ...raw.split(/['\-‐‑–]/)];
      for (const form of forms) {
        const normalized = normalizeWord(form);
        if (normalized) words.add(normalized);
      }
    }
    return words;
  };
  var GENERIC_ANSWERS = new Set(
    [
      // fr (validator.ts)
      "homme",
      "femme",
      "ville",
      "jour",
      "nuit",
      "enfant",
      "pays",
      "temps",
      "chose",
      "personne",
      "ami",
      "amie",
      "maison",
      "rue",
      "monde",
      // fr, ajouts
      "fille",
      "garcon",
      "pere",
      "mere",
      "frere",
      "soeur",
      "roi",
      "reine",
      "porte",
      "chambre",
      "voiture",
      "eau",
      "argent",
      "livre",
      "lettre",
      "table",
      "matin",
      "soir",
      "annee",
      "mois",
      "oui",
      "non",
      "rien",
      "tout",
      "quelqu",
      "quelque",
      "gens",
      "vie",
      "mort",
      "amour",
      // en
      "man",
      "woman",
      "boy",
      "girl",
      "child",
      "city",
      "town",
      "day",
      "night",
      "country",
      "time",
      "thing",
      "person",
      "friend",
      "house",
      "home",
      "street",
      "world",
      "father",
      "mother",
      "brother",
      "sister",
      "king",
      "queen",
      "door",
      "room",
      "car",
      "water",
      "money",
      "book",
      "letter",
      "table",
      "morning",
      "evening",
      "year",
      "month",
      "yes",
      "no",
      "nothing",
      "everything",
      "people",
      "life",
      "death",
      "love"
    ].map(normalizeWord)
  );
  var FR_INTERROGATIVES = /* @__PURE__ */ new Set([
    "qui",
    "que",
    "qu",
    "quoi",
    "quel",
    "quelle",
    "quels",
    "quelles",
    "ou",
    "quand",
    "comment",
    "combien",
    "pourquoi",
    "lequel",
    "laquelle",
    "lesquels",
    "lesquelles"
  ]);
  var FR_LEADING = /* @__PURE__ */ new Set([
    "a",
    "au",
    "aux",
    "de",
    "d",
    "du",
    "des",
    "avec",
    "dans",
    "sur",
    "sous",
    "chez",
    "par",
    "vers",
    "en",
    "pour",
    "contre",
    "depuis",
    "selon",
    "grace",
    "face",
    "pres",
    "loin",
    "autour",
    "et"
  ]);
  var EN_INTERROGATIVES = /* @__PURE__ */ new Set(["who", "whom", "whose", "what", "which", "where", "when", "why", "how"]);
  var EN_LEADING = /* @__PURE__ */ new Set(["to", "in", "on", "at", "with", "by", "from", "of", "for", "into", "onto", "under", "about", "and"]);
  var EN_YES_NO_OPENERS = /* @__PURE__ */ new Set([
    "is",
    "are",
    "was",
    "were",
    "do",
    "does",
    "did",
    "has",
    "have",
    "had",
    "can",
    "could",
    "will",
    "would",
    "should",
    "shall",
    "may",
    "might",
    "must",
    "am"
  ]);
  var leadingTokens = (question) => question.replace(/[’‘ʼ´`]/g, "'").split(/[\s'’]+/).map((token) => normalizeWord(token)).filter(Boolean).slice(0, 6);
  var isYesNoQuestion = (question, language) => {
    const tokens2 = leadingTokens(question);
    if (tokens2.length === 0) return false;
    const lang = language.toLowerCase();
    if (lang === "fr") {
      let index = 0;
      while (index < tokens2.length && FR_LEADING.has(tokens2[index])) index += 1;
      const head = tokens2[index];
      if (head && FR_INTERROGATIVES.has(head)) return false;
      if (/^\s*est-ce\s+qu/i.test(question.normalize("NFD").replace(/[̀-ͯ]/g, ""))) return true;
      return /-(t-)?(il|elle|ils|elles|on|tu|vous|nous|je)\b/i.test(question);
    }
    if (lang === "en") {
      let index = 0;
      while (index < tokens2.length && EN_LEADING.has(tokens2[index])) index += 1;
      const head = tokens2[index];
      if (head && EN_INTERROGATIVES.has(head)) return false;
      return !!tokens2[0] && EN_YES_NO_OPENERS.has(tokens2[0]);
    }
    return false;
  };
  var looksLikeMultipleChoice = (question) => {
    if (/(^|\s)[a-d]\)\s/i.test(question)) return true;
    if (/\bou bien\b/i.test(question)) return true;
    const head = question.replace(/\?\s*$/, "");
    return /,/.test(head) && /\s(ou|or)\s[^,]+$/i.test(head);
  };
  var ok = (code, severity, message) => ({ code, severity, ok: true, message });
  var ko = (code, severity, message) => ({ code, severity, ok: false, message });
  var ANSWER_PATTERN = /^[\p{L}\p{N}][\p{L}\p{N}'’\-]*$/u;
  var checkQuestion = (draft, ctx) => {
    const question = draft.question.trim();
    const answer = draft.answer.trim();
    const evidence = (draft.evidence ?? "").trim();
    const results = [];
    const hasSpace = /\s/.test(answer);
    results.push(
      !hasSpace && answer.length > 0 ? ok("answer_single_word", "block", "Un seul mot.") : ko("answer_single_word", "block", "La réponse doit tenir en un seul mot, sans espace (« Golden Gate » est refusé : choisis un autre fait).")
    );
    results.push(
      answer.length >= ANSWER_MIN_LENGTH && answer.length <= ANSWER_MAX_LENGTH ? ok("answer_length", "block", `Entre ${ANSWER_MIN_LENGTH} et ${ANSWER_MAX_LENGTH} caractères.`) : ko("answer_length", "block", `La réponse fait entre ${ANSWER_MIN_LENGTH} et ${ANSWER_MAX_LENGTH} caractères.`)
    );
    results.push(
      answer.length === 0 || ANSWER_PATTERN.test(answer) ? ok("answer_chars", "block", "Lettres, chiffres, trait d'union ou apostrophe.") : ko("answer_chars", "block", "La réponse ne contient que des lettres, des chiffres, un trait d'union ou une apostrophe.")
    );
    const normalizedAnswer = normalizeWord(answer);
    results.push(
      normalizedAnswer && GENERIC_ANSWERS.has(normalizedAnswer) ? ko("answer_generic", "block", `« ${answer} » est trop générique pour prouver la lecture : vise un prénom, un objet, un lieu de la scène.`) : ok("answer_generic", "block", "Réponse précise, pas un mot passe-partout.")
    );
    const questionWords = wordSet(question);
    const asciiQuestion = question.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
    const answerInQuestion = normalizedAnswer.length > 0 && (questionWords.has(normalizedAnswer) || normalizedAnswer.length >= 5 && asciiQuestion.includes(normalizedAnswer));
    results.push(
      answerInQuestion ? ko("answer_in_question", "block", "La réponse apparaît dans la question : reformule sans la donner.") : ok("answer_in_question", "block", "La question ne donne pas la réponse.")
    );
    results.push(
      question.length >= QUESTION_MIN_LENGTH && question.length <= QUESTION_MAX_LENGTH ? ok("question_length", "block", `Entre ${QUESTION_MIN_LENGTH} et ${QUESTION_MAX_LENGTH} caractères.`) : ko(
        "question_length",
        "block",
        question.length < QUESTION_MIN_LENGTH ? `Ancre la question dans une scène (qui fait quoi, où, avec quoi) : au moins ${QUESTION_MIN_LENGTH} caractères.` : `Au plus ${QUESTION_MAX_LENGTH} caractères.`
      )
    );
    results.push(
      /\?\s*$/.test(question) ? ok("question_mark", "block", "Se termine par un point d'interrogation.") : ko("question_mark", "block", "La question se termine par un point d'interrogation.")
    );
    results.push(
      isYesNoQuestion(question, ctx.language) ? ko("question_yes_no", "block", "Pas de question oui/non : commence par « Qui », « Quel », « Comment », « Où »…") : ok("question_yes_no", "block", "Question ouverte.")
    );
    results.push(
      looksLikeMultipleChoice(question) ? ko("question_multiple_choice", "warn", "On dirait un choix multiple : la réponse doit venir du lecteur, pas d'une liste.") : ok("question_multiple_choice", "warn", "Pas de choix multiple.")
    );
    const page = draft.answerPage;
    const hasPage = typeof page === "number" && Number.isInteger(page) && page >= 1;
    results.push(
      hasPage ? ok("page_missing", "block", "Page de la réponse indiquée.") : ko("page_missing", "block", "Indique la page où se trouve la réponse : c'est ce que le relecteur vérifiera.")
    );
    if (ctx.range) {
      const inRange = hasPage && page >= ctx.range.from && page <= ctx.range.to;
      results.push(
        inRange ? ok("page_in_segment", "block", `Dans les pages ${ctx.range.from} à ${ctx.range.to} de cette partie.`) : ko(
          "page_in_segment",
          "block",
          `La réponse doit se trouver dans les pages ${ctx.range.from} à ${ctx.range.to} de cette partie — et la question ne doit rien dévoiler d'après.`
        )
      );
    }
    if (evidence.length > 0) {
      results.push(
        normalizedAnswer && wordSet(evidence).has(normalizedAnswer) ? ok("evidence_contains_answer", "warn", "Le passage cité contient la réponse.") : ko("evidence_contains_answer", "warn", "Le passage cité ne contient pas la réponse telle quelle.")
      );
    }
    const blocking = results.filter((r) => !r.ok && r.severity === "block");
    const warnings = results.filter((r) => !r.ok && r.severity === "warn");
    return { results, blocking, warnings, ready: blocking.length === 0 };
  };

  // ../vread-reading-engine/src/qa/cold-prompts.ts
  var questionHash = (item) => createHash("sha1").update(item.question + "" + (item.options ?? []).join("")).digest("hex").slice(0, 12);
  var judgeHash = (args) => createHash("sha1").update(`${args.question}${args.key}${args.cold}`).digest("hex").slice(0, 12);
  var UNKNOWN_TOKENS = /* @__PURE__ */ new Set(["inconnu", "unknown", "?", ""]);
  var needsOptions = (question) => /\b(lequel|laquelle|lesquels|lesquelles)\s+(de\s+ces|d['’]entre)|\bparmi\s+(ces|les)\s+(propositions|options|réponses|affirmations|phrases)|\bquelle\s+(proposition|affirmation)\b|\bwhich\s+of\s+(the\s+following|these)\b|\bwhich\s+(statement|option|choice)\b/iu.test(question) || /\b(PAS|NOT|EXCEPT|SAUF)\b/u.test(question);
  var coldLetter = (answer) => {
    const t = answer.trim();
    if (UNKNOWN_TOKENS.has(t.toLowerCase())) return null;
    const m = /^(?:answer|réponse)?\s*:?\s*\(?([A-Ha-h])\)?(?:[.)\s]|$)/i.exec(t);
    return m ? m[1].toUpperCase() : null;
  };

  // ../vread-reading-engine/src/qa/validator.ts
  var BLACKLIST = /* @__PURE__ */ new Set([
    "homme",
    "femme",
    "ville",
    "jour",
    "nuit",
    "enfant",
    "pays",
    "temps",
    "chose",
    "personne",
    "ami",
    "amie",
    "maison",
    "rue",
    "monde"
  ]);
  var validateQuestion = (candidate) => {
    const answer = candidate.answer.trim();
    const answerWordCount = answer.split(/\s+/g).filter(Boolean).length;
    if (answerWordCount !== 1) {
      return { valid: false, reason: "answer-not-single-word" };
    }
    const normalizedAnswer = answer.toLowerCase();
    if (BLACKLIST.has(normalizedAnswer)) {
      return { valid: false, reason: "answer-blacklisted" };
    }
    const question = candidate.question.trim();
    if (question.toLowerCase().includes(normalizedAnswer)) {
      return { valid: false, reason: "answer-in-question" };
    }
    if (question.length < 35 || question.length > 160) {
      return { valid: false, reason: "question-length" };
    }
    return { valid: true };
  };

  // ../vread-reading-engine/src/qa/correction-checks.ts
  var normalizeQuote = (value) => value.normalize("NFC").replace(/[’‘ʼ]/g, "'").replace(/\s+/g, " ").trim();
  var evidenceAppearsInText = (evidence, text) => {
    const needle = normalizeQuote(evidence);
    return needle.length > 0 && normalizeQuote(text).includes(needle);
  };

  // ../vread-reading-engine/src/qa/evidence.ts
  var foldForMatch = (text) => text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[’‘ʼ´`]/g, "'").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  var matchEvidence = (quote, text, foldedText = foldForMatch(text)) => {
    if (!quote.trim()) return null;
    if (evidenceAppearsInText(quote, text)) return "exact";
    const q = foldForMatch(quote);
    if (q.length > 0 && ` ${foldedText} `.includes(` ${q} `)) return "folded";
    const parts = quote.split(/…|\.\.\.|\[…\]|\[\.\.\.\]/).map(foldForMatch).filter((p) => p.split(" ").length >= 2);
    if (parts.length > 1) {
      let from = 0;
      for (const p of parts) {
        const at = ` ${foldedText} `.indexOf(` ${p} `, from);
        if (at < 0) return null;
        from = at + p.length;
      }
      return "parts";
    }
    return null;
  };

  // ../vread-reading-engine/src/qa/duplicates.ts
  var tokens = (s) => new Set(foldForMatch(s).split(" ").filter((w) => w.length > 2));
  var similarity = (a, b) => {
    const A = tokens(a);
    const B = tokens(b);
    if (!A.size || !B.size) return 0;
    let inter = 0;
    for (const w of A) if (B.has(w)) inter += 1;
    return inter / (A.size + B.size - inter);
  };
  var DUPLICATE_THRESHOLD = 0.7;
  var findDuplicates = (items, threshold = DUPLICATE_THRESHOLD) => {
    const out = /* @__PURE__ */ new Map();
    items.forEach((item, i) => {
      for (let j = 0; j < i; j += 1) {
        const score = similarity(item.text, items[j].text);
        if (score >= threshold) {
          out.set(item.id, { of: items[j].id, score: Math.round(score * 100) / 100 });
          break;
        }
      }
    });
    return out;
  };

  // ../vread-reading-engine/src/qa/item-set.ts
  var unitIds = (item) => Array.isArray(item.unit) ? item.unit : [item.unit];

  // ../vread-reading-engine/src/qa/run.ts
  var LETTERS = "ABCDEFGH";
  var ok2 = (id, severity, message) => ({ id, ok: true, severity, message });
  var ko2 = (id, severity, message) => ({ id, ok: false, severity, message });
  var INTERROGATIVES = {
    fr: /(^|[\s'’(«"])(qui|que|qu|quoi|quel|quelle|quels|quelles|où|quand|comment|combien|pourquoi|lequel|laquelle|lesquels|lesquelles)(?=[\s'’,?!.»"]|$)/iu,
    en: /(^|[\s(“"])(who|whom|whose|what|which|where|when|why|how)(?=[\s,?!.”"']|$)/iu
  };
  var isClosedQuestion = (text, language) => {
    text = text.replace(/[“"«][^”"»]*[”"»]/g, " ").replace(/\s+/g, " ").trim() || text;
    const questions = text.split(/(?<=\?)\s+/).filter((s) => /\?\s*$/.test(s));
    const last = (questions.at(-1) ?? text).trim();
    const lastSentence = last.split(/(?<=[.!:;])\s+/).at(-1) ?? last;
    if (language.toLowerCase().startsWith("fr") && /^\s*est[-\s]ce\s+qu/i.test(lastSentence.normalize("NFD").replace(/[\u0300-\u036f]/g, ""))) return true;
    const re = INTERROGATIVES[language.toLowerCase().slice(0, 2)];
    if (re && re.test(lastSentence)) return false;
    return isYesNoQuestion(lastSentence, language);
  };
  var stripFormatHint = (text) => text.replace(/\s*\((?:un|une|en un|one|a|1)\s[^)]{1,30}\)\s*$/iu, "").trim();
  var isCloze = (text) => /(…|\.\.\.|_{3,})\s*$/.test(stripFormatHint(text)) || /_{3,}/.test(text) || /^(complétez|complete)\b/i.test(text.trim());
  var isTrueFalse = (text) => /\b(vrai ou faux|true or false)\b/i.test(text);
  var unitText = (set, item) => unitIds(item).map((u) => set.units.find((x) => x.id === u)?.text ?? "").join("\n\n");
  var unitSummary = (set, item) => set ? [...new Set(unitIds(item).map((u) => set.units.find((x) => x.id === u)?.summary ?? ""))].join("\n\n") : "";
  var coldStatus = (item, opts, set) => {
    if (item.coldExempt) return { status: "exempt", check: ok2("cold_answer", "info", "Exempt by design (measures prior knowledge).") };
    const rec = opts.cold?.get(item.id);
    if (rec?.qhash && rec.qhash !== questionHash(item)) {
      return {
        status: "pending",
        check: (opts.allowPending ? ok2 : ko2)("cold_answer", opts.allowPending ? "warn" : "block", "Stale cold answer (the question changed since): gate to re-run.")
      };
    }
    if (!rec) {
      return {
        status: "pending",
        check: (opts.allowPending ? ok2 : ko2)("cold_answer", opts.allowPending ? "warn" : "block", "No cold answer supplied: gate not run.")
      };
    }
    const answer = String(rec.answer ?? "").trim();
    if (UNKNOWN_TOKENS.has(answer.toLowerCase())) {
      return { status: "pass", answer, check: ok2("cold_answer", "block", "Not answerable without the text (cold answer: unknown).") };
    }
    if (opts.coldGate === "summary") {
      const summary = unitSummary(set, item);
      if (!summary.trim()) return { status: "pending", answer, check: ko2("cold_answer", "block", "Summary gate without a summary for this unit.") };
      if (!rec.support || !matchEvidence(rec.support, summary)) {
        return { status: "pass", answer, check: ok2("cold_answer", "block", "The cold answer does not rest on the summary (no quote found in it): ignored.") };
      }
    }
    if (item.type === "word") {
      const alts = [item.answer, ...item.accept ?? []];
      const leaks = alts.some((a) => isColdAnswerable(a, answer));
      return leaks ? { status: "leak", answer, check: ko2("cold_answer", "block", `Answerable without reading (cold answer « ${answer} »).`) } : { status: "pass", answer, check: ok2("cold_answer", "block", `Cold answer « ${answer} » is wrong.`) };
    }
    if (item.type === "mc" && (opts.coldGate === "summary" || opts.mcColdMode === "options" || needsOptions(item.question))) {
      const letter = coldLetter(answer);
      if (letter && letter === item.answer.trim().toUpperCase()) {
        return { status: "leak", answer, check: ko2("cold_answer", "block", `Answerable without reading (cold answer ${letter}).`) };
      }
      return { status: "pass", answer, check: ok2("cold_answer", "block", letter ? `Cold answer ${letter} is wrong.` : "No letter given.") };
    }
    const jrec = opts.judge?.get(item.id);
    const key = item.type === "mc" ? (item.options ?? [])["ABCDEFGH".indexOf(item.answer.trim().toUpperCase())] ?? item.answer : item.answer;
    const stale = jrec?.jhash && jrec.jhash !== judgeHash({ question: item.question, key, cold: answer });
    const verdict = stale ? void 0 : jrec?.verdict?.toLowerCase();
    if (!verdict) {
      return {
        status: "pending",
        answer,
        check: (opts.allowPending ? ok2 : ko2)("cold_answer", opts.allowPending ? "warn" : "block", "Cold answer not judged yet.")
      };
    }
    if (verdict === "correct") {
      return { status: "leak", answer, check: ko2("cold_answer", "block", "Answerable without reading: the cold answer earns full marks.") };
    }
    if (verdict === "partial") {
      return {
        status: "partial",
        answer,
        check: ko2("cold_answer", opts.partialBlocks ? "block" : "warn", "The cold answer earns part of the marks.")
      };
    }
    return { status: "pass", answer, check: ok2("cold_answer", "block", "The cold answer earns no marks.") };
  };
  var checkItem = (set, item, opts) => {
    const checks = [];
    const text = unitText(set, item);
    const folded = foldForMatch(text);
    const lang = set.language;
    const evidence = (item.evidence ?? []).filter((e) => e.trim());
    if (evidence.length === 0) {
      if (item.type !== "word") checks.push(ko2("evidence_in_unit", "warn", "No supporting passage given."));
    } else {
      const missing = evidence.filter((e) => !matchEvidence(e, text, folded));
      checks.push(
        missing.length ? ko2("evidence_in_unit", "block", `Passage not found in its unit: « ${missing[0].slice(0, 80)} »`) : ok2("evidence_in_unit", "block", "Every passage is in the unit text.")
      );
    }
    if (item.type === "word") {
      const words = buildWordSet(text);
      const alts = [item.answer, ...item.accept ?? []];
      const present = alts.some((a) => answerAppearsInText(a, words));
      checks.push(
        present ? ok2("answer_in_unit", "block", "The answer is a word of the text.") : ko2("answer_in_unit", "block", `« ${item.answer} » is not a word of the unit.`)
      );
      const report = checkQuestion(
        { question: stripFormatHint(item.question), answer: item.answer, answerPage: 1, evidence: evidence[0] ?? null },
        { language: lang, range: null }
      );
      for (const r of report.results) {
        if (r.code === "page_missing") continue;
        let res = { id: r.code === "evidence_contains_answer" ? "answer_in_evidence" : `form:${r.code}`, ok: r.ok, severity: r.severity, message: r.message };
        if (r.code === "question_yes_no") res = { ...res, ok: !isClosedQuestion(stripFormatHint(item.question), lang) };
        if (r.code === "question_mark" && !r.ok && isCloze(item.question)) res = { ...res, ok: true, message: "Cloze item (no question mark needed)." };
        checks.push(res);
      }
      const v = validateQuestion({ question: item.question, answer: item.answer });
      checks.push(v.valid ? ok2("form:validator", "warn", "Generation validator passed.") : ko2("form:validator", "warn", `Generation validator: ${v.reason}`));
    } else {
      const yesNo = isClosedQuestion(stripFormatHint(item.question), lang);
      checks.push(yesNo ? ko2("form:question_yes_no", "block", "Yes/no question.") : ok2("form:question_yes_no", "block", "Open question."));
      if (isTrueFalse(item.question)) checks.push(ko2("form:true_false", "warn", "True/false format (closed); keep only with a justification."));
      if (item.type === "open") {
        checks.push(
          looksLikeMultipleChoice(item.question) ? ko2("form:question_multiple_choice", "warn", "Looks like a hidden multiple choice.") : ok2("form:question_multiple_choice", "warn", "Not a multiple choice.")
        );
      }
      if (item.type === "mc") {
        const opts2 = item.options ?? [];
        const folds = opts2.map(foldForMatch);
        const distinct = new Set(folds).size === opts2.length && folds.every(Boolean);
        checks.push(distinct ? ok2("mc_options_distinct", "block", "Options distinct.") : ko2("mc_options_distinct", "block", "Two options are the same or empty."));
        const idx = LETTERS.indexOf(item.answer.trim().toUpperCase());
        const keyValid = idx >= 0 && idx < opts2.length;
        checks.push(keyValid ? ok2("mc_key_valid", "block", "Key is one of the options.") : ko2("mc_key_valid", "block", `Key ${item.answer} is not an option.`));
        if (keyValid) {
          const right = folds[idx];
          const stem = ` ${foldForMatch(item.question)} `;
          const given = right.split(" ").length >= 3 && stem.includes(` ${right} `);
          checks.push(given ? ko2("mc_key_in_stem", "block", "The stem contains the correct option word for word.") : ok2("mc_key_in_stem", "block", "The stem does not give the key away."));
        }
        checks.push(
          /\?\s*$/.test(item.question.trim()) || /[:…]\s*$/.test(item.question.trim()) || /_{2,}/.test(item.question) ? ok2("form:question_mark", "warn", "Ends as a question.") : ko2("form:question_mark", "warn", "The stem does not end with a question mark.")
        );
      }
    }
    const cold = coldStatus(item, opts, set);
    checks.push(cold.check);
    return { checks, cold };
  };
  var runQa = (set, opts = {}) => {
    opts = { ...opts, mcColdMode: opts.mcColdMode ?? set.coldMode ?? "open", coldGate: opts.coldGate ?? set.coldGate ?? "memory" };
    const dups = findDuplicates(set.items.map((i) => ({ id: i.id, text: i.question })));
    const items = set.items.map((item) => {
      const { checks, cold } = checkItem(set, item, opts);
      const d = dups.get(item.id);
      checks.push(d ? ko2("duplicate", "block", `Near-duplicate of ${d.of} (similarity ${d.score}).`) : ok2("duplicate", "block", "No near-duplicate."));
      const failed = checks.filter((c) => !c.ok && c.severity === "block").map((c) => c.id);
      const warnings = checks.filter((c) => !c.ok && c.severity === "warn").map((c) => c.id);
      return { id: item.id, type: item.type, question: item.question, ok: failed.length === 0, cold: cold.status, coldAnswer: cold.answer, failed, warnings, checks };
    });
    const byCheck = {};
    for (const it of items) for (const f of it.failed) byCheck[f] = (byCheck[f] ?? 0) + 1;
    const coldCounts = { pass: 0, leak: 0, partial: 0, pending: 0, exempt: 0 };
    for (const it of items) coldCounts[it.cold] += 1;
    return {
      set: set.set,
      coldGate: opts.coldGate ?? "memory",
      title: set.title,
      language: set.language,
      engine: opts.engineVersion ?? "dev",
      generatedAt: (opts.now ?? /* @__PURE__ */ new Date()).toISOString(),
      totals: {
        items: items.length,
        ok: items.filter((i) => i.ok).length,
        failing: items.filter((i) => !i.ok).length,
        byCheck,
        cold: coldCounts,
        warnings: items.reduce((n, i) => n + i.warnings.length, 0)
      },
      items
    };
  };

  // ../vread-reading-engine/src/checkpoints/build.ts
  var CHECKPOINT_FORMAT = "read-france.checkpoints/1";
  var MAX_SEGMENTS_PER_BATCH = 10;
  var sha = (s) => createHash("sha256").update(s).digest("hex");
  var segmentUnits = (units) => units.map((u, index) => {
    const words = u.text.split(/\s+/).filter(Boolean).length;
    const [seg] = segmentText(u.text, { segmentWordCount: Math.max(words, 1) });
    if (!seg) throw new Error(`unit ${u.id}: empty text`);
    return { ...seg, index, unit: u.id, label: u.label ?? u.id, file: u.file, sha256: sha(u.text) };
  });
  var segmentWholeText = (text, segmentWordCount, label = "Segment") => segmentText(text, segmentWordCount ? { segmentWordCount } : {}).map((s) => ({
    ...s,
    unit: `segment-${s.index + 1}`,
    label: `${label} ${s.index + 1}`,
    sha256: sha(s.text)
  }));
  var checkpointPrompts = (meta, segments) => {
    const out = [];
    for (let i = 0; i < segments.length; i += MAX_SEGMENTS_PER_BATCH) {
      out.push(buildGenerationPrompt({ title: meta.title, author: meta.author ?? void 0, language: meta.language }, segments.slice(i, i + MAX_SEGMENTS_PER_BATCH)));
    }
    return out;
  };
  var sentencesOf = (text) => text.split(/(?<=[.!?;:])\s+/).map((s) => s.trim()).filter((s) => s.length > 20);
  var answerCandidates = (seg, all, title = "") => {
    const titleWords = buildWordSet(title);
    const later = all.filter((s) => s.index > seg.index).map((s) => buildWordSet(s.text));
    const earlier = all.filter((s) => s.index < seg.index).map((s) => buildWordSet(s.text));
    const counts = /* @__PURE__ */ new Map();
    const tokens2 = seg.analysisWindow.excerpt.split(/\s+/);
    tokens2.forEach((tok, i) => {
      const raw = tok.replace(/^[^\p{L}]+|[^\p{L}]+$/gu, "");
      if (raw.length < 4 || /[^\p{L}'’-]/u.test(raw) || /['’-]/.test(raw)) return;
      const norm = normalizeAnswer(raw);
      if (!norm || GENERIC_ANSWERS.has(normalizeWord(raw)) || titleWords.has(norm)) return;
      const prev = tokens2[i - 1] ?? "";
      const proper = /^\p{Lu}/u.test(raw) && i > 0 && !/[.!?:;»"]$/.test(prev);
      const cur = counts.get(norm) ?? { raw, n: 0, proper: false };
      cur.n += 1;
      cur.proper || (cur.proper = proper);
      counts.set(norm, cur);
    });
    return [...counts.entries()].filter(([norm]) => later.every((w) => !w.has(norm))).map(([norm, c]) => ({ ...c, norm, seenBefore: earlier.filter((w) => w.has(norm)).length })).sort((a, b) => a.seenBefore - b.seenBefore || Number(b.proper) - Number(a.proper) || b.n - a.n || a.norm.localeCompare(b.norm)).map((c) => c.raw);
  };
  var fallbackCheckpoint = (seg, all, language, title = "") => {
    const fr = language.toLowerCase().startsWith("fr");
    for (const word of answerCandidates(seg, all, title)) {
      const re = new RegExp(`(^|[^\\p{L}])${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?=[^\\p{L}]|$)`, "u");
      const sentence = sentencesOf(seg.analysisWindow.excerpt).find((s) => re.test(s));
      if (!sentence) continue;
      const blanked = sentence.replace(re, "$1_____");
      const frame = (passage2) => fr ? `Quel mot manque dans ce passage (${seg.label}) : « ${passage2} » ?` : `Which word is missing from this passage (${seg.label}): "${passage2}"?`;
      const budget = QUESTION_MAX_LENGTH - frame("").length;
      if (budget < 30) continue;
      let passage = blanked;
      if (passage.length > budget) {
        const at = passage.indexOf("_____");
        const room = budget - 2;
        const start = Math.max(0, Math.min(at - Math.floor((room - 5) / 2), passage.length - room));
        let cut = passage.slice(start, start + room);
        if (start > 0) cut = cut.replace(/^\S*\s/, "");
        if (start + room < passage.length) cut = cut.replace(/\s\S*$/, "");
        passage = `${start > 0 ? "… " : ""}${cut.trim().replace(/[.,;:]$/, "")} …`;
      }
      const question = frame(passage);
      if (!question.includes("_____")) continue;
      return { segment: seg.index + 1, question, answer: word, evidence: sentence };
    }
    return null;
  };
  var buildCheckpoints = (args) => {
    const { segments, rows } = args;
    let integrity;
    try {
      integrity = assertGenerationIntegrity({ parsedSegmentsLength: segments.length, questions: rows });
    } catch (e) {
      integrity = e instanceof IntegrityError ? { ...e.report, error: e.message } : { error: String(e) };
    }
    const set = {
      set: `checkpoints/${args.title}`,
      title: args.title,
      author: args.author ?? null,
      language: args.language,
      units: segments.map((s) => ({ id: `s${s.index + 1}`, label: s.label, text: s.analysisWindow.excerpt })),
      items: rows.map((r) => ({
        id: `s${r.segment}`,
        unit: `s${r.segment}`,
        type: "word",
        question: r.question,
        answer: r.answer,
        evidence: r.evidence ? [r.evidence] : []
      }))
    };
    const known = new Set(segments.map((s) => `s${s.index + 1}`));
    set.items = set.items.filter((i) => known.has(i.id));
    const qa = runQa(set, { cold: args.cold, allowPending: args.allowPending, engineVersion: args.engineVersion, now: args.now });
    const checkpoints = rows.filter((r) => known.has(`s${r.segment}`)).map((r) => {
      const seg = segments[r.segment - 1];
      const rep = qa.items.find((i) => i.id === `s${r.segment}`);
      const failed = [...rep.failed];
      const warnings = [...rep.warnings];
      if (!r.evidence) failed.push("evidence_missing");
      const next = segments[r.segment];
      if (next && !answerAppearsInText(r.answer, seg.text) && answerAppearsInText(r.answer, next.text)) failed.push("not_only_in_next");
      return {
        segment: r.segment,
        unit: seg.unit,
        label: seg.label,
        question: r.question,
        answer: r.answer,
        evidence: r.evidence ?? null,
        window: { startWord: seg.analysisWindow.startWord, endWord: seg.analysisWindow.endWord },
        origin: args.origin?.get(r.segment) ?? "offline",
        ok: failed.length === 0,
        failed,
        warnings
      };
    }).sort((a, b) => a.segment - b.segment);
    return {
      format: CHECKPOINT_FORMAT,
      title: args.title,
      author: args.author ?? null,
      language: args.language,
      prompt_version: checkpointPrompts({ title: args.title, author: args.author, language: args.language }, segments.slice(0, 1))[0]?.version ?? "engine:v4",
      engine: args.engineVersion ?? "dev",
      segmentation: { mode: args.mode, segmentWordCount: args.segmentWordCount ?? null },
      source: segments.map((s) => ({ unit: s.unit, label: s.label, file: s.file, sha256: s.sha256, words: s.wordCount })),
      integrity,
      qa: qa.totals,
      checkpoints
    };
  };
  var checkpointsOk = (f) => !("error" in f.integrity) && f.checkpoints.every((c) => c.ok);

  // ../vread-reading-engine/src/ingest/text-language.ts
  var STOPWORDS = {
    fr: ["le", "la", "les", "de", "des", "et", "est", "un", "une", "que", "qui", "dans", "pas", "ne", "je", "il", "elle", "vous", "nous", "pour", "sur", "avec", "mais", "au", "du", "ce", "se", "sa", "son", "lui"],
    en: ["the", "and", "of", "to", "a", "in", "is", "that", "it", "was", "he", "she", "you", "for", "on", "with", "as", "his", "her", "at", "but", "not", "they", "be", "had", "have", "this", "from", "my", "me"],
    es: ["el", "la", "los", "las", "de", "que", "y", "en", "un", "una", "es", "por", "con", "no", "se", "su", "para", "lo", "como", "pero", "sus", "le", "ya", "muy", "fue", "este", "esta", "yo", "del", "al"],
    de: ["der", "die", "das", "und", "ist", "nicht", "ich", "sie", "er", "es", "den", "dem", "mit", "sich", "auf", "ein", "eine", "zu", "von", "war", "wie", "auch", "aber", "wir", "noch", "nur", "hatte", "hat", "dass", "mir"],
    // Les prépositions « a », « da », « in », « tra » sont les mots les plus
    // fréquents de l'italien écrit ; sans elles, le portugais (qui partage « a »,
    // « e », « de ») talonnait l'italien et la détection renonçait.
    it: ["il", "la", "di", "che", "e", "non", "un", "una", "per", "a", "da", "in", "lo", "gli", "le", "si", "del", "della", "con", "ma", "come", "tra", "più", "era", "al", "dei", "lui", "lei", "nel", "alla"],
    pt: ["o", "a", "os", "as", "de", "que", "e", "do", "da", "em", "um", "uma", "não", "para", "com", "se", "por", "mais", "como", "mas", "ele", "ela", "foi", "eu", "seu", "sua", "dos", "das", "ao", "também"],
    nl: ["de", "het", "een", "en", "van", "is", "dat", "niet", "ik", "je", "hij", "zij", "we", "op", "te", "met", "voor", "maar", "zijn", "was", "er", "aan", "ook", "als", "bij", "dan", "nog", "wel", "naar", "om"]
  };
  var SETS = Object.fromEntries(
    Object.entries(STOPWORDS).map(([lang, words]) => [lang, new Set(words)])
  );
  var SAMPLE_WORDS = 5e3;
  var MIN_WORDS = 300;
  var MIN_WINNER_RATIO = 0.12;
  var MIN_LEAD_RATIO = 1.5;
  var tokenizeForLanguage = (text) => text.toLowerCase().split(/[^\p{L}]+/u).filter((w) => w.length > 0).slice(0, SAMPLE_WORDS);
  var detectTextLanguage = (text) => {
    const words = tokenizeForLanguage(text);
    if (words.length < MIN_WORDS) return null;
    const scores = Object.keys(SETS).map((lang) => ({
      lang,
      ratio: words.reduce((n, w) => n + (SETS[lang].has(w) ? 1 : 0), 0) / words.length
    })).sort((a, b) => b.ratio - a.ratio);
    const [first, second] = scores;
    if (first.ratio < MIN_WINNER_RATIO) return null;
    if (second.ratio > 0 && first.ratio / second.ratio < MIN_LEAD_RATIO) return null;
    return first.lang;
  };

  // ../vread-reading-engine/src/version.ts
  var ENGINE_VERSION = "1.0.0";
  return __toCommonJS(engine_entry_exports);
})();
