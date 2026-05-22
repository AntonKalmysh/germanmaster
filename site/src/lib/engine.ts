import {
  ARTICLE_FORMS,
  adjEnding,
  articleForm,
  patternFor,
} from "./declension";
import { splitArticle } from "./articleSplit";
import { SENTENCE_FRAMES } from "./sentenceFrames";
import { corpusForLevel } from "./sentenceCorpus";
import type {
  ArticleType,
  DeclensionPattern,
  Exercise,
  ExerciseSegment,
  Gender,
  GrammarCase,
  Level,
  NounEntry,
  AdjectiveEntry,
  VerbEntry,
  Stage,
} from "./types";

let nextId = 0;
function newId(prefix: string) {
  nextId += 1;
  return `${prefix}-${nextId}`;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

type WordPool = {
  nouns: NounEntry[];
  verbs: VerbEntry[];
  adjectives: AdjectiveEntry[];
};

export type EngineParams = {
  stage: Stage;
  level: Level;
  cases: GrammarCase[];
  articleTypes: ArticleType[];
  /** Whether to include an adjective in the noun phrase. */
  useAdjective: boolean;
};

/**
 * Filter word pool by level — include this level and all easier levels (A1 ⊂ A2 ⊂ B1).
 */
export function poolForLevel(pool: WordPool, level: Level): WordPool {
  const order: Level[] = ["a1", "a2", "b1"];
  const max = order.indexOf(level);
  const allowed = new Set(order.slice(0, max + 1));
  return {
    nouns: pool.nouns.filter((n) => allowed.has(n.level)),
    verbs: pool.verbs.filter((v) => allowed.has(v.level)),
    adjectives: pool.adjectives.filter((a) => allowed.has(a.level)),
  };
}

function articleFromGender(gender: Gender): "der" | "die" | "das" {
  return gender === "m" ? "der" : gender === "f" ? "die" : "das";
}

/**
 * Curated (noun, adjective) pairings, harvested from the AI sentence corpus so
 * the phrase stage gets semantically natural combinations ("schneller Zug")
 * instead of random pairings ("günstiger Arzt"). The pairing is decoupled from
 * its original case/article — we re-decline it into whatever the session asks
 * for — so coverage isn't limited to the cases the corpus happens to include.
 */
function curatedPairsForLevel(
  level: Level,
): { noun: string; gender: Gender; adjective: string }[] {
  const seen = new Set<string>();
  const pairs: { noun: string; gender: Gender; adjective: string }[] = [];
  for (const e of corpusForLevel(level)) {
    if (!e.adjective_lemma) continue;
    const key = `${e.noun_lemma}|${e.adjective_lemma}`;
    if (seen.has(key)) continue;
    seen.add(key);
    pairs.push({ noun: e.noun_lemma, gender: e.gender, adjective: e.adjective_lemma });
  }
  return pairs;
}

/**
 * Build a phrase-fill exercise: optional article + optional adjective + noun.
 */
function buildPhraseExercise(
  pool: WordPool,
  params: EngineParams,
): Exercise {
  const grammarCase = pick(params.cases);
  const articleType = pick(params.articleTypes);
  const pattern = patternFor(articleType);

  // Prefer a curated noun+adjective pair for natural phrasing; fall back to a
  // random pool noun (and clean random adjective) when none is available.
  let noun: { lemma: string; gender: Gender; article: "der" | "die" | "das" };
  let adjLemma = "";
  const pairs = params.useAdjective ? curatedPairsForLevel(params.level) : [];
  if (pairs.length > 0) {
    const p = pick(pairs);
    noun = { lemma: p.noun, gender: p.gender, article: articleFromGender(p.gender) };
    adjLemma = p.adjective;
  } else {
    const n = pick(pool.nouns);
    noun = { lemma: n.lemma, gender: n.gender, article: n.article };
    adjLemma = params.useAdjective ? pick(pool.adjectives).lemma : "";
  }

  const gender: Gender = noun.gender;
  const article = articleForm(articleType, grammarCase, gender);
  const adjEndingExpected = adjLemma
    ? adjEnding(pattern, grammarCase, gender)
    : "";

  const segments: ExerciseSegment[] = [];
  const blanks: Exercise["blanks"] = [];

  segments.push({ kind: "swatch", gender });

  if (articleType !== "none") {
    const { stem, ending } = splitArticle(article, articleType);
    if (stem) {
      segments.push({ kind: "text", value: stem });
    }
    const articleBlankId = newId("blank");
    segments.push({ kind: "blank", blankId: articleBlankId });
    blanks.push({ id: articleBlankId, expected: ending, kind: "article" });
    segments.push({ kind: "text", value: " " });
  }

  if (adjLemma) {
    segments.push({ kind: "text", value: adjLemma });
    const adjBlankId = newId("blank");
    segments.push({ kind: "blank", blankId: adjBlankId });
    blanks.push({
      id: adjBlankId,
      expected: adjEndingExpected,
      kind: "adj_ending",
    });
    segments.push({ kind: "text", value: " " });
  }

  segments.push({ kind: "text", value: noun.lemma });

  return {
    id: newId("ex"),
    stage: "phrase",
    case: grammarCase,
    gender,
    articleType,
    pattern,
    segments,
    blanks,
    caseHint: grammarCase,
    noun: { lemma: noun.lemma, article: noun.article, gender: noun.gender },
    adjective: adjLemma || undefined,
  };
}

/**
 * Table-fill exercise: blank one cell of the declension table at a given (case, gender).
 * We render this as a single article blank for the (articleType, case, gender) combo.
 */
function buildTableExercise(
  pool: WordPool,
  params: EngineParams,
): Exercise {
  const articleType = pick(
    params.articleTypes.filter((t) => t !== "none"),
  ) as ArticleType;
  const grammarCase = pick(params.cases);
  const gender = pick<Gender>(["m", "f", "n", "pl"]);
  const article = articleForm(articleType, grammarCase, gender);
  const { stem, ending } = splitArticle(article, articleType);

  const segments: ExerciseSegment[] = [
    { kind: "swatch", gender },
    { kind: "text", value: stem },
  ];
  const blankId = newId("blank");
  segments.push({ kind: "blank", blankId });

  return {
    id: newId("ex"),
    stage: "table",
    case: grammarCase,
    gender,
    articleType,
    pattern: patternFor(articleType),
    segments,
    blanks: [{ id: blankId, expected: ending, kind: "article" }],
    caseHint: grammarCase,
    noun: { lemma: "", article: "der", gender },
  };
}

/**
 * Sentence-fill exercise.
 *
 * Primary path: pick an AI-generated sentence from the curated corpus
 * (data/sentences/<level>.json) that matches the session filters. Falls back
 * to the static templated frames if no corpus entry matches — e.g. when the
 * user enables a case/article combo we have no AI sentences for, or the
 * corpus has been pruned to nothing.
 */
function buildSentenceExercise(
  pool: WordPool,
  params: EngineParams,
): Exercise {
  const corpus = corpusForLevel(params.level).filter(
    (e) =>
      params.cases.includes(e.case) &&
      params.articleTypes.includes(e.article_type) &&
      (params.useAdjective ? e.adjective_lemma !== null : e.adjective_lemma === null),
  );

  if (corpus.length > 0) {
    const entry = pick(corpus);
    const grammarCase = entry.case;
    const gender = entry.gender;
    const articleType = entry.article_type;
    const pattern = patternFor(articleType);
    const article = articleForm(articleType, grammarCase, gender);

    const segments: ExerciseSegment[] = [];
    const blanks: Exercise["blanks"] = [];

    segments.push({ kind: "text", value: entry.prefix });
    segments.push({ kind: "swatch", gender });

    const { stem, ending } = splitArticle(article, articleType);
    if (articleType !== "none") {
      if (stem) segments.push({ kind: "text", value: stem });
      const articleBlankId = newId("blank");
      segments.push({ kind: "blank", blankId: articleBlankId });
      blanks.push({ id: articleBlankId, expected: ending, kind: "article" });
      segments.push({ kind: "text", value: " " });
    }

    if (entry.adjective_lemma) {
      segments.push({ kind: "text", value: entry.adjective_lemma });
      const adjBlankId = newId("blank");
      segments.push({ kind: "blank", blankId: adjBlankId });
      blanks.push({
        id: adjBlankId,
        expected: adjEnding(pattern, grammarCase, gender),
        kind: "adj_ending",
      });
      segments.push({ kind: "text", value: " " });
    }

    segments.push({ kind: "text", value: entry.noun_lemma + entry.suffix });

    return {
      id: newId("ex"),
      stage: "sentence",
      case: grammarCase,
      gender,
      articleType,
      pattern,
      segments,
      blanks,
      caseHint: grammarCase,
      verbHint: { verb: entry.verb_lemma, case: grammarCase },
      noun: {
        lemma: entry.noun_lemma,
        article: gender === "m" ? "der" : gender === "f" ? "die" : "das",
        gender,
      },
      adjective: entry.adjective_lemma || undefined,
    };
  }

  // Fallback to templated frames (random noun + adj from wordlist).
  const frames = SENTENCE_FRAMES.filter((f) => params.cases.includes(f.case));
  if (frames.length === 0) return buildPhraseExercise(pool, params);
  const frame = pick(frames);
  const grammarCase = frame.case;
  const articleType = pick(
    params.articleTypes.filter((t) => t !== "none"),
  ) as ArticleType;
  const noun = pick(pool.nouns);
  const gender = noun.gender;
  const pattern = patternFor(articleType);
  const article = articleForm(articleType, grammarCase, gender);
  const adjLemma = params.useAdjective ? pick(pool.adjectives).lemma : "";

  const segments: ExerciseSegment[] = [];
  const blanks: Exercise["blanks"] = [];
  segments.push({ kind: "text", value: frame.prefix });
  segments.push({ kind: "swatch", gender });
  if (articleType !== "none") {
    const { stem, ending } = splitArticle(article, articleType);
    if (stem) segments.push({ kind: "text", value: stem });
    const articleBlankId = newId("blank");
    segments.push({ kind: "blank", blankId: articleBlankId });
    blanks.push({ id: articleBlankId, expected: ending, kind: "article" });
    segments.push({ kind: "text", value: " " });
  }
  if (adjLemma) {
    segments.push({ kind: "text", value: adjLemma });
    const adjBlankId = newId("blank");
    segments.push({ kind: "blank", blankId: adjBlankId });
    blanks.push({
      id: adjBlankId,
      expected: adjEnding(pattern, grammarCase, gender),
      kind: "adj_ending",
    });
    segments.push({ kind: "text", value: " " });
  }
  segments.push({ kind: "text", value: noun.lemma + frame.suffix });

  return {
    id: newId("ex"),
    stage: "sentence",
    case: grammarCase,
    gender,
    articleType,
    pattern,
    segments,
    blanks,
    caseHint: grammarCase,
    verbHint: { verb: frame.verb, case: grammarCase },
    noun: { lemma: noun.lemma, article: noun.article, gender: noun.gender },
    adjective: adjLemma || undefined,
  };
}

export function generate(pool: WordPool, params: EngineParams): Exercise {
  const scoped = poolForLevel(pool, params.level);
  if (params.stage === "table") return buildTableExercise(scoped, params);
  if (params.stage === "sentence") return buildSentenceExercise(scoped, params);
  return buildPhraseExercise(scoped, params);
}
