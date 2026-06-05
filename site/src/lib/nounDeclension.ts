// Compute the full case×number declension chart for a lexicon noun.
//
// A cell is a LIST of accepted forms, not one string: German often accepts
// more than one form per cell (genitive -es/-s "des Bahnhofes/Bahnhofs",
// dative -e, plural "Jungen/Jungs"). cell[0] is the canonical/display form
// (the more formal one); the grader accepts ANY form in the list.
//
// Variant sources:
//   - generative default (this file): genitive -es/-s for regular masc/neuter
//   - authoritative overrides (`forms`, reviewed from verbformen): exact lists
//
// Rules (overrides always win):
// Declension classes (standard German taxonomy):
//   - weak (n-declension): -(e)n in all oblique singular cases
//   - mixed: weak oblique, but genitive -ns (genitiveSg) — e.g. der Name
//   - strong: masc/neuter genitive -(e)s, dative-plural -n; feminine no endings.
//     Nouns with unpredictable plurals (Datum→Daten) are strong; the plural is
//     just stored in `plural`, the case pattern is still strong.

export type Gender = "m" | "f" | "n";
export type GrammarCase = "nom" | "gen" | "dat" | "akk";
export type NounClass = "strong" | "weak" | "mixed";

export type NounLex = {
  id: string;
  lemma: string;
  gender: Gender;
  plural: string | null;
  nounClass: NounClass;
  genitiveSg?: string;
  /** Per-form overrides keyed "case.number"; a string or a list of variants. */
  forms?: Partial<Record<`${GrammarCase}.${"sg" | "pl"}`, string | string[]>>;
  pluralOnly?: boolean;
  level?: string;
  review?: string;
};

/** Each cell is a non-empty list of accepted forms, or null (no such form). */
export type Cell = string[] | null;
export type DeclensionChart = {
  sg: Record<GrammarCase, Cell>;
  pl: Record<GrammarCase, Cell>;
};

const CASES: GrammarCase[] = ["nom", "gen", "dat", "akk"];
const asList = (v: string | string[]): string[] => (Array.isArray(v) ? v : [v]);

/** Weak oblique singular: lemma + -n if it ends in -e, else + -en. */
function weakOblique(lemma: string): string {
  return lemma.endsWith("e") ? lemma + "n" : lemma + "en";
}

/** Accepted genitive-sg forms for a REGULAR masculine/neuter noun. */
function regularGenitiveVariants(lemma: string): string[] {
  if (/(s|ß|x|z|tz)$/.test(lemma)) return [lemma + "es"]; // obligatory -es
  if (/[aeiouäöüy]$/.test(lemma)) return [lemma + "s"]; // vowel-final (incl. -y: Baby) -> -s only
  if (/(el|er|en|chen|lein)$/.test(lemma)) return [lemma + "s"]; // unstressed -> -s
  return [lemma + "es", lemma + "s"]; // consonant stem -> both, -es preferred
}

function singularForm(n: NounLex, c: GrammarCase): Cell {
  if (n.pluralOnly) return null;
  const override = n.forms?.[`${c}.sg`];
  if (override) return asList(override);
  if (c === "nom") return [n.lemma];
  if (n.nounClass === "weak") return [weakOblique(n.lemma)];
  if (n.nounClass === "mixed") {
    return c === "gen" ? [n.genitiveSg ?? weakOblique(n.lemma) + "s"] : [weakOblique(n.lemma)];
  }
  // strong
  if (c === "akk" || c === "dat") return [n.lemma];
  // genitive
  if (n.gender === "f") return [n.lemma]; // feminine takes no genitive -s
  return n.genitiveSg ? [n.genitiveSg] : regularGenitiveVariants(n.lemma);
}

function pluralForm(n: NounLex, c: GrammarCase): Cell {
  const override = n.forms?.[`${c}.pl`];
  if (override) return asList(override);
  if (!n.plural) return null; // uncountable / no plural
  if (c === "dat") return [/[ns]$/.test(n.plural) ? n.plural : n.plural + "n"];
  return [n.plural];
}

export function declineNoun(n: NounLex): DeclensionChart {
  const sg = {} as Record<GrammarCase, Cell>;
  const pl = {} as Record<GrammarCase, Cell>;
  for (const c of CASES) {
    sg[c] = singularForm(n, c);
    pl[c] = pluralForm(n, c);
  }
  return { sg, pl };
}

/** True if `input` matches any accepted form in the cell (case/space-insensitive). */
export function cellAccepts(cell: Cell, input: string): boolean {
  if (!cell) return false;
  const norm = (s: string) => s.trim().toLowerCase();
  return cell.some((f) => norm(f) === norm(input));
}

/** Two cells accept the same set of forms (order-insensitive). */
function sameCell(a: Cell, b: Cell): boolean {
  if (a === null || b === null) return a === b;
  const set = (xs: string[]) => new Set(xs.map((s) => s.trim().toLowerCase()));
  const sa = set(a);
  const sb = set(b);
  return sa.size === sb.size && [...sa].every((x) => sb.has(x));
}

/**
 * The "case.number" cells whose reviewed chart deviates from the BARE class rule
 * (lemma + gender + class + plural, with genitiveSg/forms overrides stripped).
 *
 * A non-empty result is the regularity signal: it means the engine couldn't
 * derive these cells from the class and a human had to override them — i.e. the
 * noun is irregular on the case-ending axis. The plural FORM itself is memorized
 * input for every noun (not a deviation), so only a per-form plural override
 * (e.g. an irregular dat.pl) surfaces here, never the base plural.
 */
export function irregularCells(n: NounLex): string[] {
  const bare: NounLex = { ...n, genitiveSg: undefined, forms: undefined };
  const actual = declineNoun(n);
  const rule = declineNoun(bare);
  const out: string[] = [];
  for (const num of ["sg", "pl"] as const)
    for (const c of CASES) if (!sameCell(actual[num][c], rule[num][c])) out.push(`${c}.${num}`);
  return out;
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
