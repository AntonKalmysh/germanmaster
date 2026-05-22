import a1Raw from "@/data/a1.json";
import a2Raw from "@/data/a2.json";
import b1Raw from "@/data/b1.json";
import type {
  AdjectiveEntry,
  NounEntry,
  VerbEntry,
  WordEntry,
} from "./types";

const all: WordEntry[] = [
  ...(a1Raw as WordEntry[]),
  ...(a2Raw as WordEntry[]),
  ...(b1Raw as WordEntry[]),
];

/**
 * The parser tags every lowercase single-token entry as "adjective", sweeping
 * in prepositions, conjunctions, particles, pronouns, adverbs, verb fragments,
 * and OCR noise. A blocklist can't keep up, so we use a curated allowlist of
 * genuine attributive adjectives. Each entry keeps its own level, so the
 * level hierarchy (a1 ⊂ a2 ⊂ b1) still scopes which words appear in a session.
 */
const ADJECTIVES = new Set<string>([
  "abhängig", "aktiv", "aktuell", "alt", "angenehm", "ängstlich",
  "anstrengend", "anwesend", "arbeitslos", "arm", "ärgerlich", "aufregend",
  "ausländisch", "ausreichend", "äußerlich", "automatisch", "befriedigend",
  "begeistert", "begrenzt", "behindert", "bekannt", "beliebt", "bequem",
  "beruflich", "berühmt", "besetzt", "bewölkt", "billig", "bitter", "blöd",
  "blond", "böse", "breit", "bunt", "dankbar", "deutlich", "dicht", "dick",
  "digital", "direkt", "dringend", "dumm", "dunkel", "dünn", "durstig",
  "echt", "eckig", "eilig", "einfach", "elegant", "elektrisch",
  "elektronisch", "eng", "entspannend", "erkältet", "ernsthaft", "fair",
  "falsch", "fällig", "fantastisch", "farbig", "faul", "fertig", "fett",
  "finanziell", "flexibel", "fleißig", "frei", "freiwillig", "fremd",
  "freundlich", "frisch", "froh", "früh", "furchtbar", "gefährlich",
  "geeignet", "geheim", "genau", "geöffnet", "gerecht", "gesund", "gespannt",
  "gewohnt", "gewöhnlich", "giftig", "glücklich", "groß", "gültig",
  "günstig", "gut", "haltbar", "hart", "hässlich", "heimlich", "heiß",
  "hell", "herzlich", "hoch", "hungrig", "ideal", "illegal", "intelligent",
  "intensiv", "interessant", "interkulturell", "international", "jung",
  "kalt", "kaputt", "klar", "klein", "klug", "komisch", "kompliziert",
  "körperlich", "kostenlos", "krank", "kritisch", "kühl", "kulturell",
  "künstlich", "kurz", "lang", "langsam", "langweilig", "laut", "ledig",
  "leer", "leicht", "leise", "locker", "lustig", "männlich", "menschlich",
  "merkwürdig", "möbliert", "möglich", "müde", "mündlich", "mutig", "nass",
  "negativ", "nervös", "nett", "neblig", "neu", "normal", "notwendig",
  "nützlich", "offiziell", "original", "pauschal", "perfekt", "populär",
  "praktisch", "preiswert", "privat", "pünktlich", "realistisch",
  "rechtlich", "regional", "reich", "relativ", "richtig", "roh", "romantisch",
  "ruhig", "rund", "salzig", "satt", "sauber", "sauer", "schädlich",
  "scharf", "schlank", "schlecht", "schlimm", "schmutzig", "schnell",
  "schön", "schriftlich", "schuldig", "schwach", "schwanger", "schwer",
  "schwierig", "senkrecht", "sicher", "sinnlos", "sinnvoll", "sonnig",
  "spannend", "spät", "speziell", "spitz", "sportlich", "städtisch", "stark",
  "statistisch", "stilistisch", "stolz", "strafbar", "streng", "stressig",
  "süß", "sympathisch", "tatsächlich", "teuer", "tief", "tödlich",
  "tolerant", "toll", "tot", "traurig", "treu", "typisch", "ungewöhnlich",
  "unglaublich", "unterschiedlich", "vergeblich", "vergnügt", "verheiratet",
  "verliebt", "verwandt", "voll", "voraussichtlich", "vorsichtig",
  "waagerecht", "wach", "wahr", "warm", "weiblich", "weich", "weit",
  "wertlos", "wertvoll", "wichtig", "windig", "witzig", "wunderbar",
  "zahlreich", "zentral", "zugänglich", "zukünftig", "zuständig",
  "zuverlässig",
]);

export const POOL = {
  nouns: all.filter((e): e is NounEntry => e.type === "noun"),
  verbs: all.filter((e): e is VerbEntry => e.type === "verb"),
  adjectives: all
    .filter((e): e is AdjectiveEntry => e.type === "adjective")
    .filter((a) => ADJECTIVES.has(a.lemma)),
};
