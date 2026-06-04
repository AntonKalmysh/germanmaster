// Convert parsed Goethe wordlist nouns -> new NounLex format.
//
// PRINCIPLE: parse only what the source reliably states; never silently guess.
// Anything inferred or missing gets review:"<reason>" so Anton reviews exactly
// the uncertain subset, not all 329 entries.
//
// Usage: node scripts/build_lexicon.mjs a1
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const level = process.argv[2] || "a1";

const parsed = JSON.parse(readFileSync(join(ROOT, `data/wordlists/${level}.json`), "utf8"));
const nouns = parsed.filter((e) => e.type === "noun");

// Known weak-masculine nouns (n-declension): -en in all oblique sg cases.
// Curated — cannot be reliably auto-detected. Extend as we review more levels.
const WEAK_MASC = new Set([
  "Junge", "Kollege", "Kunde", "Nachbar", "Mensch", "Herr", "Tourist",
  "Polizist", "Praktikant", "Student", "Kandidat", "Patient", "Präsident",
  "Nachbar", "Bauer", "Held", "Soldat", "Automat", "Elefant", "Affe", "Hase",
]);
// Mixed declension (weak oblique but genitive -ns): der Name, der Gedanke, ...
const MIXED = new Map([
  ["Name", "Namens"], ["Gedanke", "Gedankens"], ["Glaube", "Glaubens"],
  ["Wille", "Willens"], ["Friede", "Friedens"], ["Buchstabe", "Buchstabens"],
]);

// ── AI-supplied gap fills for plurals the Goethe source omitted. ──
// Every noun touched here is flagged review:"ai-filled — verify" so Anton
// checks each one. Grouped by type for easier review.

// Lemma cleanup: parser left trailing-dash artifacts.
const LEMMA_FIX = { "Anruf-": "Anruf", "Lebens-": "Lebensmittel" };

// Singular-only / mass nouns: no everyday plural.
const UNCOUNTABLE = new Set([
  "Alter", "Appetit", "Ausland", "Butter", "Dank", "Durst", "Fieber",
  "Fleisch", "Freizeit", "Gemüse", "Gepäck", "Glück", "Halbpension",
  "Heimat", "Hunger", "Internet", "Kleidung", "Milch", "Mitte", "Obst",
  "Polizei", "Post", "Regen", "Reis", "Sport", "Unterricht", "Urlaub",
  "Vorsicht", "Wasser", "Wetter", "Wiederhören", "Wiedersehen",
]);

// Foreign/Latin nouns with memorized plurals. These are STRONG nouns (the
// case pattern is regular); only the plural form is unusual. The -um neuters
// also need a genitive override (-um is a consonant stem, so the default rule
// would wrongly offer -es): Datum -> Datums, not Datumes.
const FOREIGN_PLURAL = {
  Datum: "Daten", Konto: "Konten", Firma: "Firmen", Praktikum: "Praktika",
  Praxis: "Praxen", Studium: "Studien", Thema: "Themen",
};
const FOREIGN_GENITIVE = { Datum: "Datums", Praktikum: "Praktikums", Studium: "Studiums" };

// Regular (and umlaut) plurals the source omitted.
const PLURAL_FILL = {
  Abfahrt: "Abfahrten", Absender: "Absender", Anfang: "Anfänge",
  Ankunft: "Ankünfte", Anmeldung: "Anmeldungen", Anrede: "Anreden",
  Anruf: "Anrufe", Anschluss: "Anschlüsse", Automat: "Automaten",
  Ausflug: "Ausflüge",
  Ausgang: "Ausgänge", Ausweis: "Ausweise", Bäckerei: "Bäckereien",
  Bad: "Bäder", Bahn: "Bahnen", Bahnhof: "Bahnhöfe", Bahnsteig: "Bahnsteige",
  Balkon: "Balkone", Bank: "Banken", Bauch: "Bäuche", Bier: "Biere",
  Blick: "Blicke", Bogen: "Bögen", Chef: "Chefs", Disco: "Discos",
  Doktor: "Doktoren", Doppelzimmer: "Doppelzimmer", Dusche: "Duschen",
  Eingang: "Eingänge", Einladung: "Einladungen", Eintritt: "Eintritte",
  Einzelzimmer: "Einzelzimmer", Ende: "Enden",
  Entschuldigung: "Entschuldigungen", Essen: "Essen", Fahrer: "Fahrer",
  Familienname: "Familiennamen", Familienstand: "Familienstände",
  Feuer: "Feuer", Abflug: "Abflüge", Flughafen: "Flughäfen",
  Flugzeug: "Flugzeuge", Frühstück: "Frühstücke", Führung: "Führungen",
  Fußball: "Fußbälle", Garten: "Gärten", Geburtsjahr: "Geburtsjahre",
  Geburtsort: "Geburtsorte", Geburtstag: "Geburtstage", Geld: "Gelder",
  Gewicht: "Gewichte", Glückwunsch: "Glückwünsche", Größe: "Größen",
  Großmutter: "Großmütter", Großvater: "Großväter", Halle: "Hallen",
  Haltestelle: "Haltestellen", Hausmann: "Hausmänner", Herd: "Herde",
  Hilfe: "Hilfen", Hochzeit: "Hochzeiten", Kaffee: "Kaffees", Kasse: "Kassen",
  Kindergarten: "Kindergärten", Kiosk: "Kioske", Klasse: "Klassen",
  Kopf: "Köpfe", Küche: "Küchen", Kuchen: "Kuchen",
  Kugelschreiber: "Kugelschreiber", Kühlschrank: "Kühlschränke",
  Leben: "Leben", Lebensmittel: "Lebensmittel", Licht: "Lichter",
  Lokal: "Lokale", Meer: "Meere", Miete: "Mieten", Moment: "Momente",
  Mund: "Münder", Öl: "Öle", Ordnung: "Ordnungen", Papier: "Papiere",
  Party: "Partys", Postleitzahl: "Postleitzahlen", Prüfung: "Prüfungen",
  Reise: "Reisen", Reiseführer: "Reiseführer", Reparatur: "Reparaturen",
  Rezeption: "Rezeptionen", Saft: "Säfte", Salat: "Salate", Salz: "Salze",
  "S-Bahn": "S-Bahnen", Schalter: "Schalter", Schluss: "Schlüsse",
  Schule: "Schulen", Schwimmbad: "Schwimmbäder", See: "Seen", Sofa: "Sofas",
  Sonne: "Sonnen", Speisekarte: "Speisekarten", Stock: "Stockwerke",
  Straßenbahn: "Straßenbahnen", Tee: "Tees", Telefon: "Telefone",
  Test: "Tests", Uhr: "Uhren", Unterschrift: "Unterschriften",
  Verein: "Vereine", Vermieter: "Vermieter", Vorwahl: "Vorwahlen",
  Wein: "Weine", Welt: "Welten", Wind: "Winde", Zeit: "Zeiten", Zoll: "Zölle",
};

// Apply umlaut to the last back-vowel of a stem: a->ä, o->ö, u->ü, au->äu.
// Case-insensitive scan (lemmas are capitalized), 'au' treated as one unit,
// rightmost target wins (Bahnhof -> Bahnhöfe, Baum -> Bäume, Apfel -> Äpfel).
function umlaut(stem) {
  const lower = stem.toLowerCase();
  let idx = -1, isAu = false;
  for (let i = 0; i < lower.length; i++) {
    if (lower[i] === "a" && lower[i + 1] === "u") { idx = i; isAu = true; i++; }
    else if ("aou".includes(lower[i])) { idx = i; isAu = false; }
  }
  if (idx === -1) return stem;
  const upper = stem[idx] === stem[idx].toUpperCase();
  if (isAu) {
    return stem.slice(0, idx) + (upper ? "Äu" : "äu") + stem.slice(idx + 2);
  }
  const map = { a: "ä", o: "ö", u: "ü" };
  const repl = upper ? map[lower[idx]].toUpperCase() : map[lower[idx]];
  return stem.slice(0, idx) + repl + stem.slice(idx + 1);
}

// Parse the source plural notation into { plural, review? }.
// Handles: -en/-n/-e/-s/-er suffixes, -Ä umlaut marker, "-ä, e" umlaut+suffix,
// "(pl.)" plural-only, and missing notation.
function parsePlural(lemma, raw) {
  const m = raw.match(/,\s*(.+)$/);
  if (/\(pl\.\)/.test(raw)) return { plural: lemma, pluralOnly: true };
  if (!m) return { plural: null, review: "plural missing from source — needs lookup" };
  const note = m[1].trim();
  const umlautMark = /Ä|ä/.test(note); // source marks umlaut with Ä / ä
  const suffix = (note.match(/[a-zäöü]+\s*$/i)?.[0] || "").replace(/[Ää]/g, "").trim();
  let stem = lemma;
  if (umlautMark) stem = umlaut(stem);
  let plural;
  if (/^-?s$/.test(suffix)) plural = lemma + "s";
  else if (suffix) {
    // Avoid doubling: lemma ending in -e + "-en"/"-e" suffix -> collapse
    // (Adresse + en -> Adressen, not Adresseen).
    plural = stem.endsWith("e") && suffix.startsWith("e")
      ? stem + suffix.slice(1)
      : stem + suffix;
  } else plural = stem; // umlaut-only, no suffix (e.g. Apfel -> Äpfel)
  const review = umlautMark ? "umlaut plural — verify form" : undefined;
  return { plural, review };
}

const out = [];
const reviewItems = [];
for (const rawNoun of nouns) {
  // Normalize parser artifacts in the lemma before anything else.
  const lemma = LEMMA_FIX[rawNoun.lemma] || rawNoun.lemma;
  const n = { ...rawNoun, lemma };
  const id = "n_" + n.lemma.toLowerCase().replace(/[^a-z0-9äöüß]/g, "_");
  let { plural, pluralOnly, review: pluralReview } = parsePlural(n.lemma, n.raw || "");

  // Close the gap with AI-supplied fills where the source had no plural.
  let aiFilled = false;
  let foreign = false;
  if (plural === null && !pluralOnly) {
    if (UNCOUNTABLE.has(n.lemma)) {
      plural = null; pluralReview = "uncountable (ai-filled) — verify"; aiFilled = true;
    } else if (FOREIGN_PLURAL[n.lemma]) {
      plural = FOREIGN_PLURAL[n.lemma]; pluralReview = "foreign plural (ai-filled) — verify";
      aiFilled = true; foreign = true;
    } else if (PLURAL_FILL[n.lemma]) {
      plural = PLURAL_FILL[n.lemma]; pluralReview = "ai-filled — verify"; aiFilled = true;
    }
  }

  // Three declension classes only: weak, mixed, strong (strong is the default).
  let nounClass = "strong";
  let genitiveSg = foreign ? FOREIGN_GENITIVE[n.lemma] : undefined;
  let classReview;
  if (n.gender === "m" && WEAK_MASC.has(n.lemma)) nounClass = "weak";
  else if (MIXED.has(n.lemma)) { nounClass = "mixed"; genitiveSg = MIXED.get(n.lemma); }
  else if (n.gender === "m" && /e$/.test(n.lemma) && plural && plural === n.lemma + "n") {
    // masc ending -e with -n plural is OFTEN weak, but not always (der Käse). Flag.
    classReview = "possible weak masculine (-e noun) — confirm class";
  }

  const entry = {
    id,
    lemma: n.lemma,
    gender: n.gender,
    plural,
    nounClass,
    level: n.level,
  };
  if (genitiveSg) entry.genitiveSg = genitiveSg;
  if (pluralOnly) entry.pluralOnly = true;

  const reviews = [pluralReview, classReview].filter(Boolean);
  if (reviews.length) {
    entry.review = reviews.join("; ");
    // Categorize for the grouped review report.
    let cat = "other";
    if (classReview) cat = "class";
    else if (/uncountable/.test(pluralReview)) cat = "uncountable";
    else if (/foreign/.test(pluralReview)) cat = "foreign";
    else if (/umlaut/.test(pluralReview)) cat = "umlaut";
    else if (/ai-filled/.test(pluralReview)) cat = "aifill";
    else if (/missing/.test(pluralReview)) cat = "missing";
    reviewItems.push({ id, cat, gender: n.gender, lemma: n.lemma, plural, note: entry.review });
  }
  out.push(entry);
}

// ── Merge human corrections (the reviewed, source-of-truth layer) ──
// data/lexicon/nouns_<level>_corrections.json, keyed by noun id:
//   { "n_wasser": { "status": "corrected", "plural": "Wässer", "note": "..." },
//     "n_bahnhof": { "status": "ok" } }
// "ok" marks the entry verified as-is; "corrected" applies the given field
// overrides. Either way the review flag clears and `reviewed: true` is set.
const corrPath = join(ROOT, `data/lexicon/nouns_${level}_corrections.json`);
const corrections = existsSync(corrPath) ? JSON.parse(readFileSync(corrPath, "utf8")) : {};
let reviewedCount = 0;
const APPLY = ["plural", "nounClass", "gender", "genitiveSg", "forms", "pluralOnly"];
for (const entry of out) {
  const c = corrections[entry.id];
  if (!c) continue;
  if (c.status === "corrected") {
    for (const k of APPLY) if (k in c) entry[k] = c[k];
  }
  if (c.note) entry.reviewNote = c.note;
  delete entry.review;
  entry.reviewed = true;
  reviewedCount++;
}
// Keep only still-unreviewed items in the checklist.
const reviewedIds = new Set(out.filter((e) => e.reviewed).map((e) => e.id));
for (let i = reviewItems.length - 1; i >= 0; i--) {
  if (reviewedIds.has(reviewItems[i].id)) reviewItems.splice(i, 1);
}

mkdirSync(join(ROOT, "data/lexicon"), { recursive: true });
writeFileSync(join(ROOT, `data/lexicon/nouns_${level}.json`), JSON.stringify(out, null, 2) + "\n");

// ── Grouped markdown review checklist ──
const ART = { m: "der", f: "die", n: "das", pl: "die" };
const GROUPS = [
  ["aifill", "Plurals I supplied (source had none) — verify each", "Most are regular. Check the form is the real plural."],
  ["umlaut", "Umlaut plurals computed from source — verify", "Source marked an umlaut; I applied it. Confirm the vowel is right."],
  ["foreign", "Foreign/Latin plurals — verify", "Memorized plurals (Daten, Praxen, Themen); the noun is still strong-declension."],
  ["uncountable", "Marked as having NO everyday plural — confirm", "If any of these DO take a plural you want to drill, tell me the form."],
  ["class", "Declension class to confirm", "Likely weak masculine or an adjectival noun (der Beamte / ein Beamter). Confirm class."],
  ["missing", "STILL MISSING — needs a plural", "I could not fill these; please supply."],
];
let md = `# A1 noun review — ${out.length} nouns (${reviewItems.length} flagged)\n\n`;
md += `Source-clean (not listed here): ${out.length - reviewItems.length}. `;
md += `Mark anything wrong; I'll patch the builder.\n`;
for (const [cat, title, hint] of GROUPS) {
  const items = reviewItems.filter((r) => r.cat === cat);
  if (!items.length) continue;
  md += `\n## ${title} (${items.length})\n_${hint}_\n\n`;
  for (const r of items.sort((a, b) => a.lemma.localeCompare(b.lemma))) {
    const sg = `${ART[r.gender]} ${r.lemma}`;
    const pl = r.plural ? `die ${r.plural}` : "— (no plural)";
    md += `- [ ] **${sg}** → ${pl}\n`;
  }
}
writeFileSync(join(ROOT, `data/lexicon/nouns_${level}_review.md`), md);

console.log(`Wrote data/lexicon/nouns_${level}.json — ${out.length} nouns`);
console.log(`Wrote data/lexicon/nouns_${level}_review.md — ${reviewItems.length} flagged`);
console.log(`Human-reviewed: ${reviewedCount} | source-clean: ${out.filter((e) => !e.review && !e.reviewed).length} | pending: ${reviewItems.length}`);
for (const [cat, title] of GROUPS) {
  const c = reviewItems.filter((r) => r.cat === cat).length;
  if (c) console.log(`  ${cat}: ${c}`);
}
