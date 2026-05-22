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
 * The parser marks every lowercase single-token entry as "adjective". That
 * sweeps in prepositions, conjunctions, particles, pronouns, and adverbs that
 * don't actually decline. Exclude them so sentence slots get real attributive
 * adjectives.
 */
const NOT_ADJECTIVE = new Set<string>([
  // Prepositions
  "an", "auf", "aus", "bei", "bis", "durch", "für", "gegen", "hinter", "in",
  "mit", "nach", "neben", "ohne", "seit", "über", "um", "unter", "von", "vor",
  "während", "wegen", "zu", "zwischen", "ab", "trotz",
  // Conjunctions
  "aber", "als", "denn", "doch", "oder", "sondern", "und", "weil", "wenn",
  "obwohl", "damit", "dass", "ob", "sobald", "solange", "während",
  // Adverbs / particles / quantifiers commonly miscategorized
  "auch", "schon", "noch", "nur", "doch", "wohl", "etwa", "fast", "sehr",
  "ganz", "mal", "eben", "halt", "ja", "nein", "hier", "dort", "da", "wo",
  "weg", "los", "her", "hin", "raus", "rein", "rauf", "runter",
  "vorne", "hinten", "oben", "unten", "links", "rechts",
  "immer", "manchmal", "oft", "nie", "selten", "heute", "morgen", "gestern",
  "jetzt", "bald", "spät", "früh", "dann", "danach", "vorher", "endlich",
  "leider", "vielleicht", "wahrscheinlich", "natürlich", "hoffentlich",
  "wieder", "zurück", "weiter", "zusammen", "allein", "extra", "umsonst",
  "gern", "lieber", "am liebsten", "also", "deshalb", "trotzdem", "außerdem",
  // Pronouns / determiners stems
  "all-", "ander-", "manch-", "solch-", "welch-", "jed-", "kein-",
  // Misc
  "ja", "nein", "okay", "ok", "bitte", "danke", "tschüss", "hallo",
]);

/** Heuristic: a true attributive adjective is a stem ending in non-verb suffix. */
function isLikelyAdjective(lemma: string): boolean {
  if (NOT_ADJECTIVE.has(lemma)) return false;
  if (lemma.length < 3) return false; // single letters, short particles
  if (lemma.endsWith("-")) return false; // stem placeholders
  return true;
}

export const POOL = {
  nouns: all.filter((e): e is NounEntry => e.type === "noun"),
  verbs: all.filter((e): e is VerbEntry => e.type === "verb"),
  adjectives: all
    .filter((e): e is AdjectiveEntry => e.type === "adjective")
    .filter((a) => isLikelyAdjective(a.lemma)),
};
