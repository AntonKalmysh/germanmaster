// Bulk cross-check: diff OURS (engine-computed chart) vs verbformen across a
// whole level, so review attention goes to the disagreements instead of all
// 329 nouns one-by-one.
//
// The German declension rules live in one place (site/src/lib/nounDeclension.ts)
// and are exposed, already applied, by the review API. This script only does a
// generic set-comparison on the two charts that API returns — no linguistics
// duplicated here. It reads through the running dev server, so it always sees
// the latest cache (re-run any time as the verbformen fetch fills in).
//
// Usage:  node scripts/crosscheck_verbformen.mjs [a1]   (dev server must be up)

const level = process.argv[2] || "a1";
const API = `http://localhost:3000/api/review/nouns?level=${level}`;
const CASES = ["nom", "gen", "dat", "akk"];

let data;
try {
  data = await fetch(API).then((r) => r.json());
} catch {
  console.error(`Could not reach ${API}\nStart the dev server first:  cd site && npm run dev`);
  process.exit(1);
}
const records = data.records || [];

const norm = (s) => s.trim().toLowerCase();
const setOf = (xs) => new Set((xs || []).map(norm));
const subset = (a, b) => [...a].every((x) => b.has(x)); // a ⊆ b
const diff = (a, b) => [...a].filter((x) => !b.has(x));  // in a, not in b

const critical = []; // cores conflict — almost certainly a data error
const warn = [];     // OURS accepts a form verbformen does NOT — we're too lenient
const info = [];     // verbformen accepts a form OURS lacks — usually archaic/dialect

let checked = 0, noVf = 0, fullMatch = 0;

for (const rec of records) {
  if (!rec.vf || !rec.vf.ok) { noVf++; continue; }
  checked++;
  let nounHasDiff = false;

  for (const num of ["sg", "pl"]) {
    const vfSlot = num === "sg" ? rec.vf.singular : rec.vf.plural;
    if (!vfSlot) continue;
    for (const c of CASES) {
      const ours = rec.ours[num][c];
      const vfForms = vfSlot[c] ? vfSlot[c].forms : null;
      if (!ours || !vfForms) continue;
      const o = setOf(ours), v = setOf(vfForms);
      if (o.size === v.size && subset(o, v)) continue; // exact match

      nounHasDiff = true;
      const cell = `${c}.${num}`;
      const entry = { lemma: `${rec.gender} ${rec.lemma}`, cell, ours, vf: vfForms };

      if (subset(o, v)) {
        // verbformen superset — tag the common benign case (archaic dative -e)
        const extra = diff(v, o);
        const isDatE = c === "dat" && num === "sg" && extra.length === 1 && extra[0] === norm(rec.lemma + "e");
        info.push({ ...entry, extra, benign: isDatE });
      } else if (subset(v, o)) {
        warn.push({ ...entry, extra: diff(o, v) }); // we accept extra
      } else {
        critical.push(entry); // disjoint cores
      }
    }
  }
  if (!nounHasDiff) fullMatch++;
}

// ── Report ──
const fmt = (xs) => xs.join("/");
const line = (e, extraLabel) =>
  `  ${e.lemma.padEnd(18)} ${e.cell.padEnd(7)} ours: ${fmt(e.ours).padEnd(22)} vf: ${fmt(e.vf)}${extraLabel || ""}`;

console.log(`\nCross-check OURS vs verbformen — level ${level}`);
console.log(`${checked} cross-checked · ${fullMatch} fully match · ${noVf} not yet fetched (of ${records.length})\n`);

console.log(`━━ CRITICAL: conflicting forms (${critical.length}) — data error, fix these ━━`);
critical.length ? critical.forEach((e) => console.log(line(e))) : console.log("  (none)");

console.log(`\n━━ WARN: OURS accepts a form verbformen does not (${warn.length}) — too lenient? ━━`);
warn.length ? warn.forEach((e) => console.log(line(e, `   (we add: ${fmt(e.extra)})`))) : console.log("  (none)");

const benign = info.filter((e) => e.benign);
const realInfo = info.filter((e) => !e.benign);
console.log(`\n━━ INFO: verbformen accepts a form OURS lacks (${info.length}) ━━`);
console.log(`  archaic dative -e (OURS omits by design): ${benign.length}`);
if (realInfo.length) {
  console.log(`  other (${realInfo.length}):`);
  realInfo.forEach((e) => console.log(line(e, `   (vf adds: ${fmt(e.extra)})`)));
}

console.log(`\nFocus order: CRITICAL → WARN → INFO-other. Benign dative -e can be ignored.`);
