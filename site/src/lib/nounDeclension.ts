// Compute the full case×number declension chart for a lexicon noun from its
// (lemma, gender, plural, nounClass) plus sparse overrides. This is the "ours"
// column in the review UI and the single source of truth for noun rendering.
//
// Rules implemented (overrides in `forms` always win):
//   - weak (n-declension): -(e)n in all oblique singular cases
//   - mixed: weak oblique, but genitive -ns (stored in genitiveSg)
//   - regular: genitive -(e)s for m/n, no change for f; nom/akk/dat = lemma
//   - dative plural: +n unless the plural already ends in -s or -n
// Forms proven against the golden sample (Student, Name, Herz, Tag, Kind,
// Auto, Frau, Zug, Stadt).

export type Gender = "m" | "f" | "n";
export type GrammarCase = "nom" | "gen" | "dat" | "akk";
export type NounClass = "regular" | "weak" | "mixed" | "irregular";

export type NounLex = {
  id: string;
  lemma: string;
  gender: Gender;
  plural: string | null;
  nounClass: NounClass;
  genitiveSg?: string;
  /** Explicit per-form overrides, keyed "case.number" e.g. "gen.sg", "dat.pl". */
  forms?: Partial<Record<`${GrammarCase}.${"sg" | "pl"}`, string>>;
  pluralOnly?: boolean;
  level?: string;
  review?: string;
};

export type DeclensionChart = {
  sg: Record<GrammarCase, string | null>;
  pl: Record<GrammarCase, string | null>;
};

const CASES: GrammarCase[] = ["nom", "gen", "dat", "akk"];

/** Weak oblique singular: lemma + -n if it ends in -e, else + -en. */
function weakOblique(lemma: string): string {
  return lemma.endsWith("e") ? lemma + "n" : lemma + "en";
}

/** Regular genitive singular: -es after a sibilant/stop cluster, else -s. */
function regularGenitive(lemma: string): string {
  return /(s|ß|x|z|sch|st|tz)$/.test(lemma) ? lemma + "es" : lemma + "s";
}

function singularForm(n: NounLex, c: GrammarCase): string {
  const override = n.forms?.[`${c}.sg`];
  if (override) return override;
  if (c === "nom") return n.lemma; // only nominative is always the lemma
  // Weak & mixed nouns take the -(e)n oblique form in akk and dat too.
  if (n.nounClass === "weak") return weakOblique(n.lemma);
  if (n.nounClass === "mixed") {
    return c === "gen" ? n.genitiveSg ?? weakOblique(n.lemma) + "s" : weakOblique(n.lemma);
  }
  // regular / irregular: akk and dat = lemma
  if (c === "akk" || c === "dat") return n.lemma;
  // genitive
  if (n.gender === "f") return n.lemma; // feminine takes no genitive -s
  return n.genitiveSg ?? regularGenitive(n.lemma);
}

function pluralForm(n: NounLex, c: GrammarCase): string | null {
  // Overrides win even for nouns with no base plural (e.g. giving a plural to
  // an otherwise-uncountable noun via per-form edits).
  const override = n.forms?.[`${c}.pl`];
  if (override) return override;
  if (!n.plural) return null; // uncountable / no plural
  if (c === "dat") {
    return /[ns]$/.test(n.plural) ? n.plural : n.plural + "n";
  }
  return n.plural;
}

export function declineNoun(n: NounLex): DeclensionChart {
  const sg = {} as Record<GrammarCase, string | null>;
  const pl = {} as Record<GrammarCase, string | null>;
  for (const c of CASES) {
    sg[c] = n.pluralOnly ? null : singularForm(n, c);
    pl[c] = pluralForm(n, c);
  }
  return { sg, pl };
}

/** Definite article for display (case×gender×number). */
export function definiteArticle(c: GrammarCase, gender: Gender, plural: boolean): string {
  if (plural) return c === "dat" ? "den" : c === "gen" ? "der" : "die";
  const table: Record<GrammarCase, Record<Gender, string>> = {
    nom: { m: "der", f: "die", n: "das" },
    gen: { m: "des", f: "der", n: "des" },
    dat: { m: "dem", f: "der", n: "dem" },
    akk: { m: "den", f: "die", n: "das" },
  };
  return table[c][gender];
}
