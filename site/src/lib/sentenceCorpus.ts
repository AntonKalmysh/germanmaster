import a1Raw from "@/data/sentences/a1.json";
import a2Raw from "@/data/sentences/a2.json";
import b1Raw from "@/data/sentences/b1.json";
import type {
  ArticleType,
  Gender,
  GrammarCase,
  Level,
} from "./types";

export type SentenceCorpusEntry = {
  prefix: string;
  noun_lemma: string;
  gender: Gender;
  case: GrammarCase;
  article_type: ArticleType;
  adjective_lemma: string | null;
  verb_lemma: string;
  suffix: string;
  /** "pending" or "approved" both count as usable; "rejected" excluded. */
  status: "pending" | "approved" | "rejected";
};

const BY_LEVEL: Record<Level, SentenceCorpusEntry[]> = {
  a1: a1Raw as SentenceCorpusEntry[],
  a2: a2Raw as SentenceCorpusEntry[],
  b1: b1Raw as SentenceCorpusEntry[],
};

/**
 * Get usable sentences for a session, respecting the level hierarchy (a1 ⊂ a2 ⊂ b1).
 * Excludes entries explicitly marked "rejected"; "pending" and "approved" both pass.
 */
export function corpusForLevel(level: Level): SentenceCorpusEntry[] {
  const order: Level[] = ["a1", "a2", "b1"];
  const max = order.indexOf(level);
  const allowedLevels = order.slice(0, max + 1);
  const out: SentenceCorpusEntry[] = [];
  for (const l of allowedLevels) {
    for (const e of BY_LEVEL[l]) {
      if (e.status !== "rejected") out.push(e);
    }
  }
  return out;
}
