// Server-only helpers for the noun review tool. Reads the generated lexicon,
// the human corrections layer, and the verbformen reference cache from the
// repo-root data/ directory, and assembles per-noun review records.
//
// Dev-only: touches the filesystem. The data/ dir lives one level above the
// Next.js app (repo root), so paths resolve relative to process.cwd() = site/.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { declineNoun, type NounLex, type DeclensionChart } from "./nounDeclension";

const DATA = join(process.cwd(), "..", "data", "lexicon");
const cachePath = (lemma: string) =>
  join(DATA, "cache", "verbformen", lemma.replace(/[^\wÀ-ſ-]/g, "_") + ".json");

export type VerbformenChart = {
  url: string;
  status: number | string;
  ok: boolean;
  singular: Record<string, { article: string; forms: string[] }> | null;
  plural: Record<string, { article: string; forms: string[] }> | null;
};

export type Correction = {
  status: "ok" | "corrected";
  plural?: string | null;
  nounClass?: string;
  gender?: string;
  genitiveSg?: string;
  forms?: Record<string, string>;
  pluralOnly?: boolean;
  note?: string;
};

export type ReviewRecord = NounLex & {
  ours: DeclensionChart;
  vf: VerbformenChart | null;
  correction: Correction | null;
  reviewed: boolean;
};

const corrFile = (level: string) => join(DATA, `nouns_${level}_corrections.json`);

export function readCorrections(level: string): Record<string, Correction> {
  const f = corrFile(level);
  return existsSync(f) ? JSON.parse(readFileSync(f, "utf8")) : {};
}

export function writeCorrection(level: string, id: string, correction: Correction | null) {
  const all = readCorrections(level);
  if (correction === null) delete all[id];
  else all[id] = correction;
  writeFileSync(corrFile(level), JSON.stringify(all, null, 2) + "\n");
  return all;
}

export function loadReview(level: string): ReviewRecord[] {
  const nouns: NounLex[] = JSON.parse(readFileSync(join(DATA, `nouns_${level}.json`), "utf8"));
  const corrections = readCorrections(level);
  return nouns.map((n) => {
    const f = cachePath(n.lemma);
    const vf: VerbformenChart | null = existsSync(f) ? JSON.parse(readFileSync(f, "utf8")) : null;
    return {
      ...n,
      ours: declineNoun(n),
      vf,
      correction: corrections[n.id] ?? null,
      reviewed: !!corrections[n.id],
    };
  });
}
