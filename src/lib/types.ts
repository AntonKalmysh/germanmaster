export type Gender = "m" | "f" | "n" | "pl";
export type GrammarCase = "nom" | "akk" | "dat" | "gen";
export type DeclensionPattern = "strong" | "weak" | "mixed";
export type ArticleType = "definite" | "indefinite" | "kein" | "none";
export type Level = "a1" | "a2" | "b1";
export type Stage = "table" | "phrase" | "sentence";
export type FeedbackMode = "immediate" | "test";

export type NounEntry = {
  type: "noun";
  lemma: string;
  article: "der" | "die" | "das";
  gender: Gender;
  plural: string | null;
  level: Level;
};

export type VerbEntry = {
  type: "verb";
  lemma: string;
  forms: string | null;
  level: Level;
  object_case: "akk" | "dat" | "gen" | "none";
  prep?: string;
  prep_case?: "akk" | "dat";
};

export type AdjectiveEntry = {
  type: "adjective";
  lemma: string;
  level: Level;
};

export type WordEntry = NounEntry | VerbEntry | AdjectiveEntry;

export type ErrorKind = "case" | "gender" | "pattern" | "unknown";

export type BlankSpec = {
  id: string;
  expected: string;
  /** What this blank represents: article ending or adjective ending. */
  kind: "article" | "adj_ending";
};

export type Exercise = {
  id: string;
  stage: Stage;
  /** The grammatical case the user must produce. */
  case: GrammarCase;
  gender: Gender;
  articleType: ArticleType;
  pattern: DeclensionPattern;
  /** Display segments for rendering; "blank" segments map to blanks[i]. */
  segments: ExerciseSegment[];
  blanks: BlankSpec[];
  /** Optional supporting context shown to the user. */
  caseHint?: GrammarCase;
  patternHintLabel?: string;
  verbHint?: { verb: string; case: GrammarCase };
  /** Source data for explanations. */
  noun: { lemma: string; article: "der" | "die" | "das"; gender: Gender };
  adjective?: string;
};

export type ExerciseSegment =
  | { kind: "text"; value: string }
  | { kind: "blank"; blankId: string }
  | { kind: "swatch"; gender: Gender };

export type Answer = Record<string, string>;

export type GradeResult = {
  correct: boolean;
  perBlank: Array<{
    blankId: string;
    user: string;
    expected: string;
    correct: boolean;
    errorKind?: ErrorKind;
  }>;
  /** Top-level attribution combining all blank errors. */
  attribution?: ErrorKind;
  explanation?: string;
};

export type SessionConfig = {
  level: Level;
  stages: Stage[];
  cases: GrammarCase[];
  articleTypes: ArticleType[];
  feedback: FeedbackMode;
  length: number; // number of exercises
};

export type SessionResult = {
  exercise: Exercise;
  answer: Answer;
  grade: GradeResult;
};
