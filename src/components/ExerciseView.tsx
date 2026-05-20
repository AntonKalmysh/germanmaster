"use client";
import { useEffect, useRef, useState } from "react";
import type {
  Answer,
  Exercise,
  GradeResult,
} from "@/lib/types";
import {
  CASE_LABEL,
  GENDER_LABEL,
  PATTERN_LABEL,
} from "@/lib/declension";
import { grade } from "@/lib/grade";
import { GenderSwatch } from "./GenderSwatch";
import { BlankInput } from "./BlankInput";

type Props = {
  exercise: Exercise;
  feedback: "immediate" | "test";
  onSubmitted: (answer: Answer, result: GradeResult) => void;
  index: number;
  total: number;
};

export function ExerciseView({
  exercise,
  feedback,
  onSubmitted,
  index,
  total,
}: Props) {
  const [answer, setAnswer] = useState<Answer>({});
  const [result, setResult] = useState<GradeResult | null>(null);
  const firstBlankRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setAnswer({});
    setResult(null);
    setTimeout(() => firstBlankRef.current?.focus(), 30);
  }, [exercise.id]);

  function setBlank(blankId: string, value: string) {
    setAnswer((prev) => ({ ...prev, [blankId]: value }));
  }

  function submit() {
    if (result) {
      onSubmitted(answer, result);
      return;
    }
    const r = grade(exercise, answer);
    setResult(r);
    if (feedback === "test") {
      onSubmitted(answer, r);
    }
  }

  function next() {
    if (result) onSubmitted(answer, result);
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Enter") {
        e.preventDefault();
        if (result) next();
        else submit();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result, answer]);

  const stageLabel: Record<typeof exercise.stage, string> = {
    table: "Table",
    phrase: "Phrase",
    sentence: "Sentence",
  };

  return (
    <div className="w-full max-w-2xl mx-auto px-6 flex flex-col items-center text-center">
      {/* Top: subtle counter */}
      <div className="text-xs tracking-widest uppercase text-[var(--muted)] mb-8">
        {stageLabel[exercise.stage]} · {index + 1} of {total}
      </div>

      {/* Context label cluster: case + gender + pattern */}
      <div className="flex items-baseline gap-3 mb-6">
        <span className="font-serif-display text-2xl text-[var(--fg)]">
          {CASE_LABEL[exercise.case]}
        </span>
        {exercise.stage !== "table" && (
          <span className="text-xs uppercase tracking-widest text-[var(--muted)]">
            {PATTERN_LABEL[exercise.pattern]}
          </span>
        )}
      </div>

      {exercise.verbHint && (
        <p className="text-sm text-[var(--muted)] mb-6 -mt-2">
          <span className="text-[var(--fg)] font-medium">
            {exercise.verbHint.verb}
          </span>{" "}
          requires{" "}
          <span className="text-[var(--fg)] font-medium">
            {CASE_LABEL[exercise.verbHint.case]}
          </span>
        </p>
      )}

      {/* Exercise text — the hero. Inner block uses natural text flow so spaces between segments render. */}
      <div className="min-h-[8rem] flex items-center justify-center py-6 w-full">
        <div className="exercise-text font-serif-display text-4xl md:text-5xl leading-snug text-center max-w-3xl">
          {renderSegments(exercise, answer, setBlank, result, firstBlankRef)}
        </div>
      </div>

      {/* Gender hint below the phrase */}
      <div className="text-xs uppercase tracking-widest text-[var(--muted)] mt-1 mb-10">
        Gender: {GENDER_LABEL[exercise.gender]}
      </div>

      {/* Feedback + action row */}
      <div className="w-full flex items-center justify-between gap-4 min-h-[2.5rem]">
        <div className="flex-1 text-sm text-left">
          {result && <FeedbackLine result={result} />}
        </div>
        <button
          onClick={result ? next : submit}
          className="rounded-full bg-[var(--fg)] text-[var(--bg)] px-6 py-2.5 text-sm font-medium hover:opacity-90 transition-opacity"
        >
          {result ? "Next" : "Check"}
        </button>
      </div>
    </div>
  );
}

function renderSegments(
  exercise: Exercise,
  answer: Answer,
  setBlank: (id: string, v: string) => void,
  result: GradeResult | null,
  firstRef: React.RefObject<HTMLInputElement | null>,
) {
  const out: React.ReactNode[] = [];
  let blanksRendered = 0;
  exercise.segments.forEach((seg, i) => {
    if (seg.kind === "text") {
      out.push(<span key={i}>{seg.value}</span>);
    } else if (seg.kind === "swatch") {
      out.push(
        <span key={i} className="mr-3 align-middle">
          <GenderSwatch gender={seg.gender} size={14} />
        </span>,
      );
    } else if (seg.kind === "blank") {
      const blank = exercise.blanks.find((b) => b.id === seg.blankId)!;
      const perBlank = result?.perBlank.find((p) => p.blankId === seg.blankId);
      const status: "neutral" | "correct" | "wrong" = perBlank
        ? perBlank.correct
          ? "correct"
          : "wrong"
        : "neutral";
      const width = Math.max(56, (blank.expected.length || 1) * 18 + 24);
      out.push(
        <BlankInput
          key={i}
          ref={blanksRendered === 0 ? firstRef : undefined}
          gender={exercise.gender}
          status={status}
          value={answer[seg.blankId] ?? ""}
          onChange={(e) => setBlank(seg.blankId, e.target.value)}
          width={width}
          maxLength={4}
          disabled={!!result}
        />,
      );
      blanksRendered++;
    }
  });
  return out;
}

function FeedbackLine({ result }: { result: GradeResult }) {
  if (result.correct) {
    return <span className="text-[var(--ok)]">Correct.</span>;
  }
  return <span className="text-[var(--error)]">{result.explanation}</span>;
}
