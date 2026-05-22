import type { GrammarCase } from "./types";

/**
 * Curated sentence frames for stage 3. Each frame is a grammatically real
 * sentence where the slot is filled with a noun phrase in the specified case.
 * Subject + verb (and any preposition) are pre-rendered in `prefix`; the noun
 * phrase blanks follow; `suffix` is the sentence-final punctuation.
 *
 * These are intentionally curated — semantic pairings (verb + noun) may be
 * imperfect but are always grammatically correct, which is what matters for
 * declension drilling.
 */
export type SentenceFrame = {
  prefix: string; // text before the noun phrase, including trailing space
  suffix: string; // text after the noun phrase (usually ".")
  case: GrammarCase;
  verb: string; // for the verb-requires-case hint
};

export const SENTENCE_FRAMES: SentenceFrame[] = [
  // Akkusativ — transitive verbs
  { prefix: "Ich sehe ", suffix: ".", case: "akk", verb: "sehen" },
  { prefix: "Ich kaufe ", suffix: ".", case: "akk", verb: "kaufen" },
  { prefix: "Ich brauche ", suffix: ".", case: "akk", verb: "brauchen" },
  { prefix: "Ich suche ", suffix: ".", case: "akk", verb: "suchen" },
  { prefix: "Ich finde ", suffix: ".", case: "akk", verb: "finden" },
  { prefix: "Wir haben ", suffix: ".", case: "akk", verb: "haben" },
  { prefix: "Er liest ", suffix: ".", case: "akk", verb: "lesen" },
  { prefix: "Sie kennt ", suffix: ".", case: "akk", verb: "kennen" },
  { prefix: "Sie schreibt ", suffix: ".", case: "akk", verb: "schreiben" },
  { prefix: "Wir besuchen ", suffix: ".", case: "akk", verb: "besuchen" },

  // Akkusativ — preposition + Akk
  { prefix: "Ich warte auf ", suffix: ".", case: "akk", verb: "warten auf" },
  { prefix: "Sie denkt an ", suffix: ".", case: "akk", verb: "denken an" },
  { prefix: "Wir hoffen auf ", suffix: ".", case: "akk", verb: "hoffen auf" },
  { prefix: "Ich bitte um ", suffix: ".", case: "akk", verb: "bitten um" },
  { prefix: "Er interessiert sich für ", suffix: ".", case: "akk", verb: "sich interessieren für" },
  { prefix: "Wir freuen uns auf ", suffix: ".", case: "akk", verb: "sich freuen auf" },

  // Dativ — verbs that govern dative
  { prefix: "Ich helfe ", suffix: ".", case: "dat", verb: "helfen" },
  { prefix: "Ich danke ", suffix: ".", case: "dat", verb: "danken" },
  { prefix: "Es gehört ", suffix: ".", case: "dat", verb: "gehören" },
  { prefix: "Wir gratulieren ", suffix: ".", case: "dat", verb: "gratulieren" },
  { prefix: "Sie antwortet ", suffix: ".", case: "dat", verb: "antworten" },

  // Dativ — preposition + Dat
  { prefix: "Wir sprechen mit ", suffix: ".", case: "dat", verb: "sprechen mit" },
  { prefix: "Er telefoniert mit ", suffix: ".", case: "dat", verb: "telefonieren mit" },
  { prefix: "Sie fährt mit ", suffix: ".", case: "dat", verb: "fahren mit" },
  { prefix: "Ich komme aus ", suffix: ".", case: "dat", verb: "kommen aus" },
  { prefix: "Wir wohnen bei ", suffix: ".", case: "dat", verb: "wohnen bei" },
  { prefix: "Es passt zu ", suffix: ".", case: "dat", verb: "passen zu" },

  // Nominativ — copula and existential
  { prefix: "Das ist ", suffix: ".", case: "nom", verb: "sein" },
  { prefix: "Hier kommt ", suffix: ".", case: "nom", verb: "kommen" },
  { prefix: "Es gibt ", suffix: ".", case: "akk", verb: "es gibt" },
];
