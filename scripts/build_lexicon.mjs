// Convert parsed Goethe wordlist nouns -> new NounLex format.
//
// PRINCIPLE: parse only what the source reliably states; never silently guess.
// Anything inferred or missing gets review:"<reason>" so Anton reviews exactly
// the uncertain subset, not all 329 entries.
//
// Usage: node scripts/build_lexicon.mjs a1
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
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

// Foreign/Latin irregular plurals — also get nounClass "irregular".
const IRREGULAR = {
  Datum: "Daten", Konto: "Konten", Firma: "Firmen", Praktikum: "Praktika",
  Praxis: "Praxen", Studium: "Studien", Thema: "Themen",
};

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
  let irregular = false;
  if (plural === null && !pluralOnly) {
    if (UNCOUNTABLE.has(n.lemma)) {
      plural = null; pluralReview = "uncountable (ai-filled) — verify"; aiFilled = true;
    } else if (IRREGULAR[n.lemma]) {
      plural = IRREGULAR[n.lemma]; pluralReview = "irregular plural (ai-filled) — verify";
      aiFilled = true; irregular = true;
    } else if (PLURAL_FILL[n.lemma]) {
      plural = PLURAL_FILL[n.lemma]; pluralReview = "ai-filled — verify"; aiFilled = true;
    }
  }

  let nounClass = irregular ? "irregular" : "regular";
  let genitiveSg;
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
    else if (/irregular/.test(pluralReview)) cat = "irregular";
    else if (/umlaut/.test(pluralReview)) cat = "umlaut";
    else if (/ai-filled/.test(pluralReview)) cat = "aifill";
    else if (/missing/.test(pluralReview)) cat = "missing";
    reviewItems.push({ cat, gender: n.gender, lemma: n.lemma, plural, note: entry.review });
  }
  out.push(entry);
}

mkdirSync(join(ROOT, "data/lexicon"), { recursive: true });
writeFileSync(join(ROOT, `data/lexicon/nouns_${level}.json`), JSON.stringify(out, null, 2) + "\n");

// ── Grouped markdown review checklist ──
const ART = { m: "der", f: "die", n: "das", pl: "die" };
const GROUPS = [
  ["aifill", "Plurals I supplied (source had none) — verify each", "Most are regular. Check the form is the real plural."],
  ["umlaut", "Umlaut plurals computed from source — verify", "Source marked an umlaut; I applied it. Confirm the vowel is right."],
  ["irregular", "Irregular (Latin/foreign) plurals — verify", "These break normal rules; double-check."],
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
console.log(`Source-clean: ${out.length - reviewItems.length}`);
for (const [cat, title] of GROUPS) {
  const c = reviewItems.filter((r) => r.cat === cat).length;
  if (c) console.log(`  ${cat}: ${c}`);
}
