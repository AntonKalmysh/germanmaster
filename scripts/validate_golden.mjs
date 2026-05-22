// Stress-test the proposed lexicon/content schema against the golden sample.
// Renders every lexeme paradigm and every sentence from its tokens, then asserts
// the rendered sentence reproduces the human-reviewed canonical `text`.
// Standalone (no deps); run: node scripts/validate_golden.mjs
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "data", "golden");
const read = (p) => JSON.parse(readFileSync(join(ROOT, p), "utf8"));
const nouns = read("lexicon/nouns.json");
const verbs = read("lexicon/verbs.json");
const adjs = read("lexicon/adjectives.json");
const sentences = read("content/sentences.json");
const byId = (arr) => Object.fromEntries(arr.map((e) => [e.id, e]));
const N = byId(nouns), A = byId(adjs), V = byId(verbs);

// --- grammar tables (mirror of site/src/lib/declension.ts) ---
const ARTICLE = {
  definite: { nom: { m: "der", f: "die", n: "das", pl: "die" }, akk: { m: "den", f: "die", n: "das", pl: "die" }, dat: { m: "dem", f: "der", n: "dem", pl: "den" }, gen: { m: "des", f: "der", n: "des", pl: "der" } },
  indefinite: { nom: { m: "ein", f: "eine", n: "ein", pl: "" }, akk: { m: "einen", f: "eine", n: "ein", pl: "" }, dat: { m: "einem", f: "einer", n: "einem", pl: "" }, gen: { m: "eines", f: "einer", n: "eines", pl: "" } },
  kein: { nom: { m: "kein", f: "keine", n: "kein", pl: "keine" }, akk: { m: "keinen", f: "keine", n: "kein", pl: "keine" }, dat: { m: "keinem", f: "keiner", n: "keinem", pl: "keinen" }, gen: { m: "keines", f: "keiner", n: "keines", pl: "keiner" } },
  none: { nom: { m: "", f: "", n: "", pl: "" }, akk: { m: "", f: "", n: "", pl: "" }, dat: { m: "", f: "", n: "", pl: "" }, gen: { m: "", f: "", n: "", pl: "" } },
};
const ADJ = {
  weak: { nom: { m: "e", f: "e", n: "e", pl: "en" }, akk: { m: "en", f: "e", n: "e", pl: "en" }, dat: { m: "en", f: "en", n: "en", pl: "en" }, gen: { m: "en", f: "en", n: "en", pl: "en" } },
  mixed: { nom: { m: "er", f: "e", n: "es", pl: "en" }, akk: { m: "en", f: "e", n: "es", pl: "en" }, dat: { m: "en", f: "en", n: "en", pl: "en" }, gen: { m: "en", f: "en", n: "en", pl: "en" } },
  strong: { nom: { m: "er", f: "e", n: "es", pl: "e" }, akk: { m: "en", f: "e", n: "es", pl: "e" }, dat: { m: "em", f: "er", n: "em", pl: "en" }, gen: { m: "en", f: "er", n: "en", pl: "er" } },
};
const patternFor = (t) => (t === "definite" ? "weak" : t === "indefinite" || t === "kein" ? "mixed" : "strong");
const CASES = ["nom", "akk", "dat", "gen"];

// --- renderers ---
const weakOblique = (lemma) => (lemma.endsWith("e") ? lemma + "n" : lemma + "en");

function renderNoun(n, c, num) {
  const key = `${c}.${num}`;
  if (n.forms && n.forms[key]) return n.forms[key];
  if (num === "pl") {
    const base = n.plural;
    return c === "dat" && !/[ns]$/.test(base) ? base + "n" : base;
  }
  if (c === "nom") return n.lemma;
  if (n.nounClass === "weak") return weakOblique(n.lemma);
  if (n.nounClass === "mixed") return c === "gen" ? n.genitiveSg ?? weakOblique(n.lemma) + "s" : weakOblique(n.lemma);
  if (c === "gen") return n.gender === "f" ? n.lemma : n.genitiveSg ?? n.lemma + "s";
  return n.lemma;
}
const renderAdj = (a, pattern, c, g, num) => (a.attributiveStem ?? a.lemma) + ADJ[pattern][c][num === "pl" ? "pl" : g];

function renderNP(np) {
  const noun = N[np.nounId];
  const g = np.number === "pl" ? "pl" : noun.gender;
  const pieces = [];
  const art = ARTICLE[np.articleType][np.case][g];
  if (art) pieces.push(art);
  if (np.adjectiveId) pieces.push(renderAdj(A[np.adjectiveId], patternFor(np.articleType), np.case, noun.gender, np.number));
  pieces.push(renderNoun(noun, np.case, np.number));
  return pieces.join(" ");
}

function renderSentence(s) {
  const parts = s.tokens.map((t) => (t.kind === "literal" ? t.text : renderNP(t)));
  return parts.join(" ").replace(/\s+([.,!?])/g, "$1");
}

// --- noun ending extraction (for phrasal ending-fill mode) ---
function nounEnding(n, c, num) {
  const form = renderNoun(n, c, num);
  if (form.startsWith(n.lemma)) return { ending: form.slice(n.lemma.length), stemChange: false };
  return { ending: form, stemChange: true }; // umlaut/irregular -> whole word, not an ending
}

// ============ REPORT ============
console.log("=== NOUN PARADIGMS (review these forms) ===");
for (const n of nouns) {
  const sg = CASES.map((c) => renderNoun(n, c, "sg")).join(" / ");
  const pl = CASES.map((c) => renderNoun(n, c, "pl")).join(" / ");
  console.log(`${n.lemma} (${n.gender}, ${n.nounClass})`);
  console.log(`   sg [nom/akk/dat/gen]: ${sg}`);
  console.log(`   pl [nom/akk/dat/gen]: ${pl}`);
}

console.log("\n=== ADJECTIVE ATTRIBUTIVE STEMS + COMPARISON ===");
for (const a of adjs) {
  const sample = renderAdj(a, "weak", "nom", "m", "sg"); // "der ___e"
  console.log(`${a.lemma} -> attr "${sample}" | comp ${a.comparative ?? "(reg)"} | superl ${a.superlative ?? "(reg)"}`);
}

console.log("\n=== VERB GOVERNANCE ===");
for (const v of verbs) {
  let gov;
  if (v.governs && v.governs !== "none") gov = `governs ${v.governs}`;
  else if (v.prepositions) gov = v.prepositions.map((p) => `${p.prep}+${p.case} (${p.type})`).join(", ");
  else gov = "intransitive (no object)";
  console.log(`${v.lemma}: ${gov} | aux ${v.aux} | sep ${v.separable} | 3sg ${v.conjugation?.present3sg ?? "(reg)"}`);
}

// Level invariant: a sentence may use words BELOW its level (expected), but
// never ABOVE it. max(word.level) must be <= sentence.level.
const LV = { a1: 1, a2: 2, b1: 3 };
function levelCheck(s) {
  const words = [];
  if (s.verbId && V[s.verbId]) words.push(V[s.verbId]);
  for (const t of s.tokens) {
    if (t.kind !== "np") continue;
    if (N[t.nounId]) words.push(N[t.nounId]);
    if (t.adjectiveId && A[t.adjectiveId]) words.push(A[t.adjectiveId]);
  }
  const over = words.filter((w) => LV[w.level] > LV[s.level]);
  const maxWord = words.reduce((m, w) => (LV[w.level] > LV[m] ? w.level : m), "a1");
  return { over, maxWord };
}

console.log("\n=== SENTENCE VALIDATION (render(tokens) === text?) ===");
let fail = 0;
for (const s of sentences) {
  const rendered = renderSentence(s);
  const ok = rendered === s.text;
  if (!ok) fail++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${s.id}`);
  console.log(`   expected: ${s.text}`);
  console.log(`   rendered: ${rendered}`);
  const { over, maxWord } = levelCheck(s);
  if (over.length) {
    fail++;
    console.log(`   ! LEVEL VIOLATION: sentence is ${s.level} but uses ${over.map((w) => w.lemma + "=" + w.level).join(", ")} (above level)`);
  } else {
    console.log(`   level ok: sentence ${s.level}, heaviest word ${maxWord} (using lower-level vocab is fine)`);
  }
  for (const t of s.tokens) {
    if (t.kind !== "np") continue;
    const noun = N[t.nounId];
    const { ending, stemChange } = nounEnding(noun, t.case, t.number);
    if (stemChange) console.log(`   ! noun "${noun.lemma}" ${t.case}.${t.number} is a STEM CHANGE ("${renderNoun(noun, t.case, t.number)}") — cannot be an ending-only blank`);
    else if (ending) console.log(`   noun ending blank: ${noun.lemma}[${ending}]`);
  }
}
console.log(`\n${fail === 0 ? "ALL SENTENCES VALID" : fail + " FAILED"}`);
process.exit(fail === 0 ? 0 : 1);
