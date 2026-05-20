"use client";
import { useEffect, useState } from "react";
import type {
  ArticleType,
  GrammarCase,
  Level,
  SessionConfig,
  Stage,
} from "@/lib/types";

const STORAGE_KEY = "gm.config.v1";

const DEFAULT_CONFIG: SessionConfig = {
  level: "a1",
  stages: ["table", "phrase"],
  cases: ["nom", "akk"],
  articleTypes: ["definite", "indefinite"],
  feedback: "immediate",
  length: 20,
};

export function loadConfig(): SessionConfig {
  if (typeof window === "undefined") return DEFAULT_CONFIG;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_CONFIG;
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function saveConfig(c: SessionConfig) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(c));
}

type Props = {
  onStart: (c: SessionConfig) => void;
};

export function SessionConfigForm({ onStart }: Props) {
  const [config, setConfig] = useState<SessionConfig>(DEFAULT_CONFIG);

  useEffect(() => {
    setConfig(loadConfig());
  }, []);

  function update<K extends keyof SessionConfig>(key: K, value: SessionConfig[K]) {
    setConfig((prev) => {
      const next = { ...prev, [key]: value };
      // Adjust default cases by level: A1 → Nom+Akk; A2/B1 → all four.
      if (key === "level") {
        if (value === "a1") next.cases = ["nom", "akk"];
        else next.cases = ["nom", "akk", "dat", "gen"];
      }
      return next;
    });
  }

  function start() {
    saveConfig(config);
    onStart(config);
  }

  return (
    <div className="w-full max-w-md mx-auto px-6 py-12">
      <h1 className="font-serif-display text-5xl mb-2">germanmaster</h1>
      <p className="text-sm text-[var(--muted)] mb-10">
        Drill der/die/das, case endings, and adjective declension.
      </p>

      <Group label="Level">
        <Toggle
          options={[
            { v: "a1", l: "A1" },
            { v: "a2", l: "A2" },
            { v: "b1", l: "B1" },
          ]}
          value={config.level}
          onChange={(v) => update("level", v as Level)}
        />
      </Group>

      <Group label="Stages">
        <MultiToggle
          options={[
            { v: "table", l: "Table" },
            { v: "phrase", l: "Phrase" },
            { v: "sentence", l: "Sentence" },
          ]}
          value={config.stages}
          onChange={(v) => update("stages", v as Stage[])}
        />
      </Group>

      <Group label="Cases">
        <MultiToggle
          options={[
            { v: "nom", l: "Nom" },
            { v: "akk", l: "Akk" },
            { v: "dat", l: "Dat" },
            { v: "gen", l: "Gen" },
          ]}
          value={config.cases}
          onChange={(v) => update("cases", v as GrammarCase[])}
        />
      </Group>

      <Group label="Articles">
        <MultiToggle
          options={[
            { v: "definite", l: "der/die/das" },
            { v: "indefinite", l: "ein/eine" },
            { v: "kein", l: "kein" },
            { v: "none", l: "no article" },
          ]}
          value={config.articleTypes}
          onChange={(v) => update("articleTypes", v as ArticleType[])}
        />
      </Group>

      <Group label="Feedback">
        <Toggle
          options={[
            { v: "immediate", l: "Immediate" },
            { v: "test", l: "Test (end)" },
          ]}
          value={config.feedback}
          onChange={(v) => update("feedback", v as "immediate" | "test")}
        />
      </Group>

      <Group label="Session length">
        <Toggle
          options={[
            { v: 10, l: "10" },
            { v: 20, l: "20" },
            { v: 40, l: "40" },
          ]}
          value={config.length}
          onChange={(v) => update("length", v as number)}
        />
      </Group>

      <button
        onClick={start}
        disabled={config.stages.length === 0 || config.cases.length === 0}
        className="mt-8 w-full rounded-full bg-[var(--fg)] text-[var(--bg)] py-3 text-sm font-medium hover:opacity-90 disabled:opacity-40"
      >
        Start
      </button>
    </div>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <div className="text-xs uppercase tracking-wider text-[var(--muted)] mb-2">
        {label}
      </div>
      {children}
    </div>
  );
}

function Toggle<T>({
  options,
  value,
  onChange,
}: {
  options: { v: T; l: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="inline-flex rounded-full border border-[var(--line-strong)] overflow-hidden">
      {options.map((o, i) => (
        <button
          key={i}
          onClick={() => onChange(o.v)}
          className={`px-4 py-1.5 text-sm transition-colors ${
            o.v === value
              ? "bg-[var(--fg)] text-[var(--bg)]"
              : "text-[var(--fg)] hover:bg-[var(--line)]"
          }`}
        >
          {o.l}
        </button>
      ))}
    </div>
  );
}

function MultiToggle<T>({
  options,
  value,
  onChange,
}: {
  options: { v: T; l: string }[];
  value: T[];
  onChange: (v: T[]) => void;
}) {
  function toggle(v: T) {
    if (value.includes(v)) onChange(value.filter((x) => x !== v));
    else onChange([...value, v]);
  }
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o, i) => (
        <button
          key={i}
          onClick={() => toggle(o.v)}
          className={`rounded-full border px-3 py-1 text-sm transition-colors ${
            value.includes(o.v)
              ? "border-[var(--fg)] bg-[var(--fg)] text-[var(--bg)]"
              : "border-[var(--line-strong)] text-[var(--fg)] hover:bg-[var(--line)]"
          }`}
        >
          {o.l}
        </button>
      ))}
    </div>
  );
}
