// Fetch + parse + cache verbformen.com noun declension charts.
// Reference data for the human review UI — NOT auto-applied to the lexicon.
//
// Usage:
//   node scripts/fetch_verbformen.mjs --sample     # diverse 15-noun prototype
//   node scripts/fetch_verbformen.mjs a1           # all nouns in a level (cached)
//
// Politeness: ~3s between live fetches, escalating backoff + retry on 429,
// only fetches what isn't cached, sends a descriptive User-Agent. Transient
// failures (429/5xx/network) are never cached, so re-running resumes them.
// Cache lives in data/lexicon/cache/verbformen/.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CACHE = join(ROOT, "data/lexicon/cache/verbformen");
mkdirSync(CACHE, { recursive: true });

const UA = "germanmaster-dataset-builder/0.1 (personal language-learning project)";
const CASES = ["nom", "gen", "dat", "akk"]; // verbformen order: Nom, Gen, Dat, Acc

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Strip tags, footnote superscripts (⁰-⁹), and whitespace from a cell.
function clean(s) {
  return s
    .replace(/<[^>]+>/g, "")
    .replace(/[⁰-⁹°¹²³⁴-⁹]/g, "")
    .replace(/&[a-z]+;/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Parse the singular + plural declension tables out of the page HTML.
// Returns { singular: {nom,gen,dat,akk}, plural: {...} } where each value is
// { article, forms: string[] } (forms split on "/" for variants), or null.
function parse(html) {
  const tables = html.match(/<table[\s\S]*?<\/table>/g) || [];
  const caseTables = [];
  for (const t of tables) {
    if (!/Nom\.|Gen\.|Dat\.|Acc\./.test(t)) continue;
    const rows = t.match(/<tr[\s\S]*?<\/tr>/g) || [];
    const byCase = {};
    for (const r of rows) {
      const cells = (r.match(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/g) || [])
        .map((c) => clean(c.replace(/<t[dh][^>]*>|<\/t[dh]>/g, "")))
        .filter(Boolean);
      if (cells.length < 3) continue;
      const label = cells[0].toLowerCase();
      const ci = label.startsWith("nom") ? "nom" : label.startsWith("gen") ? "gen"
        : label.startsWith("dat") ? "dat" : label.startsWith("acc") || label.startsWith("akk") ? "akk" : null;
      if (!ci) continue;
      byCase[ci] = { article: cells[1], forms: cells[2].split("/").map((x) => x.trim()).filter(Boolean) };
    }
    if (Object.keys(byCase).length >= 3) caseTables.push(byCase);
  }
  return { singular: caseTables[0] || null, plural: caseTables[1] || null };
}

const BASE_DELAY = 3000;            // polite gap between live fetches
const BACKOFF = [20e3, 45e3, 90e3, 180e3]; // escalating waits on a 429
const MAX_RETRIES = BACKOFF.length;

// A status is transient (retry, never cache) vs permanent (cache the verdict).
// 429/5xx/network errors are transient; 200 and a genuine 404 are permanent.
const isTransient = (s) =>
  s === 429 || (typeof s === "number" && s >= 500) || String(s).startsWith("ERR");

async function getNoun(lemma) {
  const safe = lemma.replace(/[^\wÀ-ſ-]/g, "_");
  const cacheFile = join(CACHE, `${safe}.json`);
  if (existsSync(cacheFile)) return { lemma, ...JSON.parse(readFileSync(cacheFile, "utf8")), cached: true };

  const url = `https://www.verbformen.com/declension/nouns/${encodeURIComponent(lemma)}.htm`;
  for (let attempt = 0; ; attempt++) {
    let html = null, status = 0;
    try {
      const res = await fetch(url, { headers: { "User-Agent": UA } });
      status = res.status;
      if (res.ok) html = await res.text();
    } catch (e) {
      status = `ERR ${e.message}`;
    }

    if (isTransient(status)) {
      if (attempt >= MAX_RETRIES) return { lemma, url, status, ok: false, singular: null, plural: null, cached: false, failed: true };
      const wait = BACKOFF[attempt];
      console.log(`   ⏳ ${status} on ${lemma} — backing off ${wait / 1000}s (retry ${attempt + 1}/${MAX_RETRIES})`);
      await sleep(wait);
      continue;
    }

    // Permanent outcome (200 with forms, or a real 404): parse, cache, move on.
    const parsed = html ? parse(html) : { singular: null, plural: null };
    const ok = !!(parsed.singular || parsed.plural);
    const record = { url, status, ok, ...parsed };
    writeFileSync(cacheFile, JSON.stringify(record, null, 2) + "\n");
    await sleep(BASE_DELAY);
    return { lemma, ...record, cached: false };
  }
}

const SAMPLE = [
  "Bahnhof", "Tag", "Frau", "Adresse",        // regular
  "Junge", "Kollege", "Mensch", "Herr",        // weak masc
  "Name",                                       // mixed (gen Namens)
  "Datum", "Thema", "Praxis",                  // irregular foreign
  "Wasser", "Hunger",                          // uncountable
  "Apfel", "Stadt", "Haus",                    // umlaut
];

const arg = process.argv[2] || "--sample";
const lemmas = arg === "--sample"
  ? SAMPLE
  : JSON.parse(readFileSync(join(ROOT, `data/lexicon/nouns_${arg}.json`), "utf8")).map((n) => n.lemma);

console.log(`Fetching ${lemmas.length} nouns (cached are instant)...\n`);
const fmt = (slot) => slot ? CASES.map((c) => slot[c] ? slot[c].forms.join("/") : "—").join(" · ") : "(none)";
let live = 0, cached = 0, failed = 0, consecutiveFails = 0;
for (const lemma of lemmas) {
  const r = await getNoun(lemma);
  if (r.cached) { cached++; continue; }       // silent on cache hits — keeps the log readable
  live++;
  if (r.failed) {
    failed++;
    consecutiveFails++;
    console.log(`${lemma}  ✗ gave up (${r.status}) — left uncached, will retry on resume`);
    // Circuit-breaker: if throttling is relentless, stop rather than hammer.
    if (consecutiveFails >= 3) {
      console.log(`\nAborting: ${consecutiveFails} nouns failed in a row — verbformen is throttling persistently.`);
      console.log(`Cache is preserved; re-run the same command later to resume only the missing ones.`);
      break;
    }
    continue;
  }
  consecutiveFails = 0;
  const flag = r.ok ? "" : `  ⚠ ${r.status}`;
  console.log(`${lemma}${flag}`);
  console.log(`   sg: ${fmt(r.singular)}`);
  console.log(`   pl: ${fmt(r.plural)}`);
}
console.log(`\nDone. ${live} live fetch(es) (${failed} failed), ${cached} from cache.`);
console.log(`Cache: data/lexicon/cache/verbformen/`);
