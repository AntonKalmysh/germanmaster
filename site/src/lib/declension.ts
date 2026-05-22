import type {
  ArticleType,
  DeclensionPattern,
  Gender,
  GrammarCase,
} from "./types";

/**
 * Article forms by article type, case, and gender. "" means no article rendered.
 */
export const ARTICLE_FORMS: Record<
  ArticleType,
  Record<GrammarCase, Record<Gender, string>>
> = {
  definite: {
    nom: { m: "der", f: "die", n: "das", pl: "die" },
    akk: { m: "den", f: "die", n: "das", pl: "die" },
    dat: { m: "dem", f: "der", n: "dem", pl: "den" },
    gen: { m: "des", f: "der", n: "des", pl: "der" },
  },
  indefinite: {
    nom: { m: "ein", f: "eine", n: "ein", pl: "" },
    akk: { m: "einen", f: "eine", n: "ein", pl: "" },
    dat: { m: "einem", f: "einer", n: "einem", pl: "" },
    gen: { m: "eines", f: "einer", n: "eines", pl: "" },
  },
  kein: {
    nom: { m: "kein", f: "keine", n: "kein", pl: "keine" },
    akk: { m: "keinen", f: "keine", n: "kein", pl: "keine" },
    dat: { m: "keinem", f: "keiner", n: "keinem", pl: "keinen" },
    gen: { m: "keines", f: "keiner", n: "keines", pl: "keiner" },
  },
  none: {
    nom: { m: "", f: "", n: "", pl: "" },
    akk: { m: "", f: "", n: "", pl: "" },
    dat: { m: "", f: "", n: "", pl: "" },
    gen: { m: "", f: "", n: "", pl: "" },
  },
};

/**
 * Adjective endings (the part after the stem) by declension pattern, case, gender.
 */
export const ADJ_ENDINGS: Record<
  DeclensionPattern,
  Record<GrammarCase, Record<Gender, string>>
> = {
  weak: {
    nom: { m: "e", f: "e", n: "e", pl: "en" },
    akk: { m: "en", f: "e", n: "e", pl: "en" },
    dat: { m: "en", f: "en", n: "en", pl: "en" },
    gen: { m: "en", f: "en", n: "en", pl: "en" },
  },
  mixed: {
    nom: { m: "er", f: "e", n: "es", pl: "en" },
    akk: { m: "en", f: "e", n: "es", pl: "en" },
    dat: { m: "en", f: "en", n: "en", pl: "en" },
    gen: { m: "en", f: "en", n: "en", pl: "en" },
  },
  strong: {
    nom: { m: "er", f: "e", n: "es", pl: "e" },
    akk: { m: "en", f: "e", n: "es", pl: "e" },
    dat: { m: "em", f: "er", n: "em", pl: "en" },
    gen: { m: "en", f: "er", n: "en", pl: "er" },
  },
};

/** Map an article type to the declension pattern it triggers for following adjectives. */
export function patternFor(articleType: ArticleType): DeclensionPattern {
  if (articleType === "definite") return "weak";
  if (articleType === "indefinite" || articleType === "kein") return "mixed";
  return "strong";
}

export function articleForm(
  type: ArticleType,
  c: GrammarCase,
  g: Gender,
): string {
  return ARTICLE_FORMS[type][c][g];
}

export function adjEnding(
  pattern: DeclensionPattern,
  c: GrammarCase,
  g: Gender,
): string {
  return ADJ_ENDINGS[pattern][c][g];
}

/**
 * Given an article form (e.g., "den"), return all (case, gender) it could match
 * for the given article type. Used by the grader for error attribution.
 */
export function matchesArticle(
  user: string,
  type: ArticleType,
): Array<{ case: GrammarCase; gender: Gender }> {
  const matches: Array<{ case: GrammarCase; gender: Gender }> = [];
  const cases: GrammarCase[] = ["nom", "akk", "dat", "gen"];
  const genders: Gender[] = ["m", "f", "n", "pl"];
  for (const c of cases) {
    for (const g of genders) {
      if (ARTICLE_FORMS[type][c][g].toLowerCase() === user.toLowerCase()) {
        matches.push({ case: c, gender: g });
      }
    }
  }
  return matches;
}

/**
 * Given an adjective ending (e.g., "en"), return all (pattern, case, gender) it matches.
 */
export function matchesAdjEnding(
  user: string,
): Array<{ pattern: DeclensionPattern; case: GrammarCase; gender: Gender }> {
  const matches: Array<{
    pattern: DeclensionPattern;
    case: GrammarCase;
    gender: Gender;
  }> = [];
  const patterns: DeclensionPattern[] = ["weak", "mixed", "strong"];
  const cases: GrammarCase[] = ["nom", "akk", "dat", "gen"];
  const genders: Gender[] = ["m", "f", "n", "pl"];
  for (const p of patterns) {
    for (const c of cases) {
      for (const g of genders) {
        if (ADJ_ENDINGS[p][c][g].toLowerCase() === user.toLowerCase()) {
          matches.push({ pattern: p, case: c, gender: g });
        }
      }
    }
  }
  return matches;
}

export const CASE_LABEL: Record<GrammarCase, string> = {
  nom: "Nominativ",
  akk: "Akkusativ",
  dat: "Dativ",
  gen: "Genitiv",
};

export const GENDER_LABEL: Record<Gender, string> = {
  m: "maskulin",
  f: "feminin",
  n: "neutral",
  pl: "Plural",
};

export const ARTICLE_TYPE_LABEL: Record<ArticleType, string> = {
  definite: "der/die/das",
  indefinite: "ein/eine",
  kein: "kein/keine",
  none: "ohne Artikel",
};

export const PATTERN_LABEL: Record<DeclensionPattern, string> = {
  weak: "schwach",
  mixed: "gemischt",
  strong: "stark",
};
