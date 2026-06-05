// Server-only helpers for the noun review tool. Reads the generated lexicon,
// the human corrections layer, and the verbformen reference cache from the
// repo-root data/ directory, and assembles per-noun review records.
//
// Dev-only: touches the filesystem. The data/ dir lives one level above the
// Next.js app (repo root), so paths resolve relative to process.cwd() = site/.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { declineNoun, irregularCells, type NounLex, type DeclensionChart } from "./nounDeclension";

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
  forms?: Record<string, string | string[]>;
  pluralOnly?: boolean;
  note?: string;
};

export type ReviewRecord = NounLex & {
  ours: DeclensionChart;
  /** Derived: this noun needed a case-ending override the class rule couldn't produce. */
  irregular: boolean;
  /** Derived: which "case.number" cells deviate from the bare class rule. */
  irregularCells: string[];
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

/** Apply a saved correction's field overrides onto a noun (mirrors the builder
 *  merge) so the displayed "ours" chart reflects what was reviewed. */
function applyCorrection(n: NounLex, c: Correction | null): NounLex {
  if (!c || c.status !== "corrected") return n;
  const merged = { ...n } as NounLex;
  if ("plural" in c) merged.plural = c.plural ?? null;
  if (c.nounClass) merged.nounClass = c.nounClass as NounLex["nounClass"];
  if (c.gender) merged.gender = c.gender as NounLex["gender"];
  if ("genitiveSg" in c) merged.genitiveSg = c.genitiveSg;
  if ("pluralOnly" in c) merged.pluralOnly = c.pluralOnly;
  if (c.forms) merged.forms = { ...n.forms, ...c.forms } as NounLex["forms"];
  return merged;
}

export function loadReview(level: string): ReviewRecord[] {
  const nouns: NounLex[] = JSON.parse(readFileSync(join(DATA, `nouns_${level}.json`), "utf8"));
  const corrections = readCorrections(level);
  return nouns.map((n) => {
    const f = cachePath(n.lemma);
    const vf: VerbformenChart | null = existsSync(f) ? JSON.parse(readFileSync(f, "utf8")) : null;
    const correction = corrections[n.id] ?? null;
    const applied = applyCorrection(n, correction);
    const cells = irregularCells(applied);
    return {
      ...n,
      ours: declineNoun(applied),
      irregular: cells.length > 0,
      irregularCells: cells,
      vf,
      correction,
      reviewed: !!correction,
    };
  });
}
