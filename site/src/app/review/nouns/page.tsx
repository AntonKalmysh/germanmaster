"use client";
import { useEffect, useMemo, useState } from "react";

const CASES = ["nom", "gen", "dat", "akk"] as const;
const CASE_LABEL: Record<string, string> = { nom: "Nom", gen: "Gen", dat: "Dat", akk: "Akk" };
const ART: Record<string, string> = { m: "der", f: "die", n: "das" };

type Slot = Record<string, { article: string; forms: string[] }> | null;
type Cell = string[] | null;
type Rec = {
  id: string; lemma: string; gender: "m" | "f" | "n"; plural: string | null;
  nounClass: string; genitiveSg?: string; pluralOnly?: boolean;
  ours: { sg: Record<string, Cell>; pl: Record<string, Cell> };
  vf: { ok: boolean; singular: Slot; plural: Slot } | null;
  correction: { status: string } | null;
  reviewed: boolean;
};

function vfForms(slot: Slot, c: string): string[] | null {
  return slot && slot[c] ? slot[c].forms : null;
}
const cellText = (cell: Cell): string => (cell && cell.length ? cell.join(" / ") : "—");

export default function NounReview() {
  const [records, setRecords] = useState<Rec[]>([]);
  const [i, setI] = useState(0);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [meta, setMeta] = useState<{ plural: string; nounClass: string; genitiveSg: string; pluralOnly: boolean }>(
    { plural: "", nounClass: "regular", genitiveSg: "", pluralOnly: false },
  );
  const [saving, setSaving] = useState(false);

  async function load() {
    const r = await fetch("/api/review/nouns?level=a1").then((x) => x.json());
    setRecords(r.records ?? []);
  }
  useEffect(() => { load(); }, []);

  const rec = records[i];
  const reviewedCount = useMemo(() => records.filter((r) => r.reviewed).length, [records]);

  function startEdit() {
    if (!rec) return;
    const d: Record<string, string> = {};
    for (const num of ["sg", "pl"] as const)
      for (const c of CASES) d[`${c}.${num}`] = (rec.ours[num][c] ?? []).join(" / ");
    setDraft(d);
    setMeta({
      plural: rec.plural ?? "", nounClass: rec.nounClass,
      genitiveSg: rec.genitiveSg ?? "", pluralOnly: !!rec.pluralOnly,
    });
    setEditing(true);
  }

  async function save(correction: object | null) {
    if (!rec) return;
    setSaving(true);
    await fetch("/api/review/nouns?level=a1", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: rec.id, correction }),
    });
    // reflect locally without a full reload
    setRecords((prev) => prev.map((r, idx) =>
      idx === i ? { ...r, reviewed: correction !== null, correction: correction as Rec["correction"] } : r));
    setSaving(false);
    setEditing(false);
    next();
  }

  function saveEdits() {
    if (!rec) return;
    const forms: Record<string, string | string[]> = {};
    for (const num of ["sg", "pl"] as const)
      for (const c of CASES) {
        const key = `${c}.${num}`;
        const orig = (rec.ours[num][c] ?? []).join(" / ");
        const v = draft[key].trim();
        if (v && v !== orig) {
          const variants = v.split("/").map((x) => x.trim()).filter(Boolean);
          forms[key] = variants.length > 1 ? variants : variants[0];
        }
      }
    const correction: Record<string, unknown> = { status: "corrected" };
    if (meta.plural !== (rec.plural ?? "")) correction.plural = meta.plural || null;
    if (meta.nounClass !== rec.nounClass) correction.nounClass = meta.nounClass;
    if (meta.genitiveSg !== (rec.genitiveSg ?? "")) correction.genitiveSg = meta.genitiveSg;
    if (meta.pluralOnly !== !!rec.pluralOnly) correction.pluralOnly = meta.pluralOnly;
    if (Object.keys(forms).length) correction.forms = forms;
    save(correction);
  }

  function next() { setEditing(false); setI((x) => Math.min(x + 1, records.length - 1)); }
  function prev() { setEditing(false); setI((x) => Math.max(x - 1, 0)); }
  function nextPending() {
    const idx = records.findIndex((r, k) => k > i && !r.reviewed);
    if (idx >= 0) { setEditing(false); setI(idx); }
  }

  if (!records.length) return <div className="p-8 text-sm text-neutral-500">Loading review data…</div>;
  if (!rec) return <div className="p-8">Done.</div>;

  const mism = (num: "sg" | "pl", c: string) => {
    const ours = rec.ours[num][c];
    const vf = vfForms(num === "sg" ? rec.vf?.singular ?? null : rec.vf?.plural ?? null, c);
    if (!ours || !vf) return false;
    // flag when the accepted-form sets differ at all
    const a = new Set(ours.map((s) => s.toLowerCase()));
    const b = new Set(vf.map((s) => s.toLowerCase()));
    return a.size !== b.size || [...a].some((x) => !b.has(x));
  };

  return (
    <div className="max-w-3xl mx-auto p-6 font-mono text-sm">
      {/* progress */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-neutral-500">
          {i + 1} / {records.length} · reviewed {reviewedCount} · pending {records.length - reviewedCount}
        </div>
        <div className="flex gap-2">
          <button onClick={prev} className="px-2 py-1 border rounded">← prev</button>
          <button onClick={nextPending} className="px-2 py-1 border rounded">next pending</button>
          <button onClick={next} className="px-2 py-1 border rounded">next →</button>
        </div>
      </div>
      <div className="h-1 bg-neutral-200 rounded mb-6">
        <div className="h-1 bg-green-500 rounded" style={{ width: `${(reviewedCount / records.length) * 100}%` }} />
      </div>

      {/* header */}
      <div className="flex items-baseline gap-3 mb-1">
        <h1 className="text-2xl">{ART[rec.gender]} {rec.lemma}</h1>
        {rec.reviewed && <span className="text-green-600 text-xs">✓ reviewed ({rec.correction?.status})</span>}
      </div>
      <div className="text-neutral-500 mb-4">
        {rec.gender} · {rec.nounClass} · pl: {rec.plural ?? "—"}
        {rec.vf ? (rec.vf.ok ? "" : " · ⚠ verbformen: no data") : " · verbformen not fetched"}
      </div>

      {/* comparison table */}
      <table className="w-full border-collapse mb-6">
        <thead>
          <tr className="text-neutral-400 text-xs">
            <th className="text-left w-12"></th>
            <th className="text-left">OURS (sg)</th><th className="text-left">verbformen (sg)</th>
            <th className="text-left">OURS (pl)</th><th className="text-left">verbformen (pl)</th>
          </tr>
        </thead>
        <tbody>
          {CASES.map((c) => {
            const vfSg = vfForms(rec.vf?.singular ?? null, c);
            const vfPl = vfForms(rec.vf?.plural ?? null, c);
            return (
              <tr key={c} className="border-t">
                <td className="text-neutral-400">{CASE_LABEL[c]}</td>
                <td className={mism("sg", c) ? "bg-amber-100" : ""}>{cellText(rec.ours.sg[c])}</td>
                <td className="text-neutral-600">{vfSg ? vfSg.join(" / ") : "—"}</td>
                <td className={mism("pl", c) ? "bg-amber-100" : ""}>{cellText(rec.ours.pl[c])}</td>
                <td className="text-neutral-600">{vfPl ? vfPl.join(" / ") : "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {!editing ? (
        <div className="flex gap-2">
          <button onClick={() => save({ status: "ok" })} disabled={saving}
            className="px-3 py-2 bg-green-600 text-white rounded">✓ Correct as-is</button>
          <button onClick={startEdit} className="px-3 py-2 border rounded">✎ Edit forms</button>
          <button onClick={next} className="px-3 py-2 border rounded text-neutral-500">Skip</button>
          {rec.reviewed && (
            <button onClick={() => save(null)} className="px-3 py-2 border rounded text-red-600 ml-auto">Clear review</button>
          )}
        </div>
      ) : (
        <div className="border rounded p-4 space-y-3 bg-neutral-50">
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1">plural
              <input value={meta.plural} onChange={(e) => setMeta({ ...meta, plural: e.target.value })}
                className="border rounded px-2 py-1" /></label>
            <label className="flex flex-col gap-1">nounClass
              <select value={meta.nounClass} onChange={(e) => setMeta({ ...meta, nounClass: e.target.value })}
                className="border rounded px-2 py-1">
                {["strong", "weak", "mixed"].map((x) => <option key={x}>{x}</option>)}
              </select></label>
            <label className="flex flex-col gap-1">genitiveSg (override)
              <input value={meta.genitiveSg} onChange={(e) => setMeta({ ...meta, genitiveSg: e.target.value })}
                className="border rounded px-2 py-1" /></label>
            <label className="flex items-center gap-2 mt-6">
              <input type="checkbox" checked={meta.pluralOnly}
                onChange={(e) => setMeta({ ...meta, pluralOnly: e.target.checked })} /> plural-only</label>
          </div>
          <div className="text-xs text-neutral-400 pt-2">Per-form overrides (only edit cells that are wrong):</div>
          <div className="grid grid-cols-4 gap-2">
            {(["sg", "pl"] as const).map((num) => CASES.map((c) => (
              <label key={`${c}.${num}`} className="flex flex-col gap-1 text-xs text-neutral-500">
                {CASE_LABEL[c]} {num}
                <input value={draft[`${c}.${num}`] ?? ""} onChange={(e) => setDraft({ ...draft, [`${c}.${num}`]: e.target.value })}
                  className="border rounded px-2 py-1 text-sm text-black" />
              </label>
            )))}
          </div>
          <div className="flex gap-2 pt-2">
            <button onClick={saveEdits} disabled={saving} className="px-3 py-2 bg-blue-600 text-white rounded">Save correction</button>
            <button onClick={() => setEditing(false)} className="px-3 py-2 border rounded">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
