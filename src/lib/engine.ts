import {
  ARTICLE_FORMS,
  adjEnding,
  articleForm,
  patternFor,
} from "./declension";
import { splitArticle } from "./articleSplit";
import { SENTENCE_FRAMES } from "./sentenceFrames";
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

/**
 * Build a phrase-fill exercise: optional article + optional adjective + noun.
 */
function buildPhraseExercise(
  pool: WordPool,
  params: EngineParams,
): Exercise {
  const noun = pick(pool.nouns);
  const grammarCase = pick(params.cases);
  let articleType = pick(params.articleTypes);
  // Indefinite has no plural form — if we picked plural noun + indefinite, switch.
  // (Goethe nouns don't expose plural-only entries here; we default to singular.)
  if (articleType === "indefinite") {
    // ok in singular
  }
  const gender: Gender = noun.gender;
  const pattern = patternFor(articleType);

  const article = articleForm(articleType, grammarCase, gender);
  const adjLemma = params.useAdjective ? pick(pool.adjectives).lemma : "";
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
 * Sentence-fill exercise: a curated sentence frame whose verb (and any
 * preposition) force a specific case on the noun-phrase blank.
 */
function buildSentenceExercise(
  pool: WordPool,
  params: EngineParams,
): Exercise {
  const frames = SENTENCE_FRAMES.filter((f) => params.cases.includes(f.case));
  if (frames.length === 0) {
    return buildPhraseExercise(pool, params);
  }
  const frame = pick(frames);
  const grammarCase = frame.case;

  // Avoid 'none' for sentence stage.
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
