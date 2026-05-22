"use client";
import type { SessionResult } from "@/lib/types";
import { CASE_LABEL } from "@/lib/declension";

type Props = {
  results: SessionResult[];
  onExit: () => void;
};

export function ResultsView({ results, onExit }: Props) {
  const total = results.length;
  const correct = results.filter((r) => r.grade.correct).length;
  const pct = Math.round((correct / total) * 100);

  // Tally errors by attribution.
  const tally = { case: 0, gender: 0, pattern: 0, unknown: 0 };
  for (const r of results) {
    if (r.grade.attribution) {
      tally[r.grade.attribution] += 1;
    }
  }

  // Per-case accuracy.
  const perCase = new Map<string, { right: number; total: number }>();
  for (const r of results) {
    const k = r.exercise.case;
    const cur = perCase.get(k) ?? { right: 0, total: 0 };
    cur.total += 1;
    if (r.grade.correct) cur.right += 1;
    perCase.set(k, cur);
  }

  return (
    <div className="w-full max-w-2xl mx-auto px-6 py-12">
      <h1 className="font-serif-display text-5xl mb-2">{pct}%</h1>
      <p className="text-sm text-[var(--muted)] mb-10">
        {correct} of {total} correct.
      </p>

      <section className="mb-8">
        <div className="text-xs uppercase tracking-wider text-[var(--muted)] mb-3">
          Error breakdown
        </div>
        <div className="flex gap-3 flex-wrap">
          <Stat label="case" value={tally.case} />
          <Stat label="gender" value={tally.gender} />
          <Stat label="pattern" value={tally.pattern} />
          <Stat label="other" value={tally.unknown} />
        </div>
      </section>

      <section className="mb-8">
        <div className="text-xs uppercase tracking-wider text-[var(--muted)] mb-3">
          By case
        </div>
        <div className="flex flex-col gap-2">
          {[...perCase.entries()].map(([c, v]) => (
            <div key={c} className="flex items-baseline justify-between text-sm">
              <span>{CASE_LABEL[c as keyof typeof CASE_LABEL]}</span>
              <span className="font-mono text-[var(--muted)]">
                {v.right} / {v.total}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-8">
        <div className="text-xs uppercase tracking-wider text-[var(--muted)] mb-3">
          Missed
        </div>
        <ul className="flex flex-col gap-2 text-sm">
          {results
            .filter((r) => !r.grade.correct)
            .slice(0, 12)
            .map((r, i) => (
              <li key={i} className="text-[var(--muted)]">
                <span className="text-[var(--fg)]">
                  {r.grade.perBlank
                    .map((p) =>
                      p.correct ? p.user : `${p.user || "—"}→${p.expected || "—"}`,
                    )
                    .join(" · ")}
                </span>{" "}
                · {r.grade.explanation}
              </li>
            ))}
        </ul>
      </section>

      <button
        onClick={onExit}
        className="rounded-full bg-[var(--fg)] text-[var(--bg)] px-5 py-2 text-sm font-medium hover:opacity-90"
      >
        Done
      </button>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-[var(--line-strong)] px-3 py-2 min-w-[80px]">
      <div className="text-xs uppercase tracking-wider text-[var(--muted)]">
        {label}
      </div>
      <div className="font-serif-display text-2xl">{value}</div>
    </div>
  );
}
