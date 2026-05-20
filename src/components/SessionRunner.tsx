"use client";
import { useMemo, useState } from "react";
import type {
  Answer,
  Exercise,
  GradeResult,
  SessionConfig,
  SessionResult,
  Stage,
} from "@/lib/types";
import { generate } from "@/lib/engine";
import { POOL } from "@/lib/wordlist";
import { ExerciseView } from "./ExerciseView";
import { ResultsView } from "./ResultsView";

function buildSession(config: SessionConfig): Exercise[] {
  const out: Exercise[] = [];
  for (let i = 0; i < config.length; i++) {
    const stage: Stage = config.stages[i % config.stages.length];
    out.push(
      generate(POOL, {
        stage,
        level: config.level,
        cases: config.cases,
        articleTypes: config.articleTypes,
        useAdjective: stage !== "table",
      }),
    );
  }
  return out;
}

type Props = {
  config: SessionConfig;
  onExit: () => void;
};

export function SessionRunner({ config, onExit }: Props) {
  const exercises = useMemo(() => buildSession(config), [config]);
  const [index, setIndex] = useState(0);
  const [results, setResults] = useState<SessionResult[]>([]);
  const [done, setDone] = useState(false);

  function onSubmitted(answer: Answer, grade: GradeResult) {
    const r: SessionResult = { exercise: exercises[index], answer, grade };
    const next = [...results, r];
    setResults(next);
    if (index + 1 >= exercises.length) {
      setDone(true);
    } else {
      setIndex(index + 1);
    }
  }

  if (done) {
    return <ResultsView results={results} onExit={onExit} />;
  }

  return (
    <div className="flex-1 flex flex-col">
      <div className="px-6 py-4 flex items-center justify-between text-xs text-[var(--muted)]">
        <button onClick={onExit} className="hover:text-[var(--fg)]">
          ← back
        </button>
        <span className="uppercase tracking-wider">
          {config.level.toUpperCase()} · {config.feedback}
        </span>
      </div>
      <div className="flex-1 flex items-center justify-center">
        <ExerciseView
          exercise={exercises[index]}
          feedback={config.feedback}
          index={index}
          total={exercises.length}
          onSubmitted={onSubmitted}
        />
      </div>
    </div>
  );
}
