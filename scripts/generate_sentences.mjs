#!/usr/bin/env node
/**
 * Generate AI-authored German sentence corpus for the declension drill.
 *
 * Per level: cycles through (case, gender, article_type, with_adjective) combos
 * and asks Claude for N grammatically-correct sentences per combo. Wordlist is
 * cached so repeated requests cost ~0.1x. Output validated via structured outputs.
 *
 * Usage:
 *   ANTHROPIC_API_KEY=sk-ant-... node scripts/generate_sentences.mjs <level> [--per-combo N]
 *
 * Level: a1 | a2 | b1
 *
 * Output is written to data/sentences/<level>.json with status:"pending" per entry.
 * Edit the JSON to mark approved (status:"approved") or reject (delete the entry
 * or set status:"rejected"). The app only loads status:"approved" sentences.
 */
import Anthropic from "@anthropic-ai/sdk";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const LEVELS = ["a1", "a2", "b1"];
const CASES = ["nom", "akk", "dat"]; // gen rare in spoken German; skip for v1
const GENDERS = ["m", "f", "n", "pl"];
const ARTICLE_TYPES = ["definite", "indefinite", "kein"];
const ADJ_VARIANTS = [true, false];

const SENTENCE_SCHEMA = {
  type: "object",
  properties: {
    sentences: {
      type: "array",
      items: {
        type: "object",
        properties: {
          prefix: {
            type: "string",
            description:
              'Text BEFORE the noun phrase, including trailing space. E.g. "Ich suche " or "Wir warten auf ".',
          },
          noun_lemma: {
            type: "string",
            description: "The German noun (capitalized) used in the sentence.",
          },
          gender: { type: "string", enum: GENDERS },
          case: { type: "string", enum: CASES },
          article_type: { type: "string", enum: ARTICLE_TYPES },
          adjective_lemma: {
            type: ["string", "null"],
            description:
              "The adjective stem (no ending) used between article and noun, or null if none.",
          },
          verb_lemma: {
            type: "string",
            description:
              'The verb lemma that forces the case, including separable particles and prepositions. E.g. "suchen", "warten auf", "helfen".',
          },
          suffix: {
            type: "string",
            description:
              'Sentence-final punctuation after the noun. Almost always ".".',
          },
        },
        required: [
          "prefix",
          "noun_lemma",
          "gender",
          "case",
          "article_type",
          "adjective_lemma",
          "verb_lemma",
          "suffix",
        ],
        additionalProperties: false,
      },
    },
  },
  required: ["sentences"],
  additionalProperties: false,
};

function loadWordlist(level) {
  const wl = JSON.parse(
    fs.readFileSync(path.join(ROOT, "data", "wordlists", `${level}.json`), "utf8"),
  );
  const nouns = wl.filter((e) => e.type === "noun");
  const verbs = wl.filter((e) => e.type === "verb");
  const adjs = wl.filter((e) => e.type === "adjective");
  return { nouns, verbs, adjs };
}

function buildSystemPrompt(level, wordlist) {
  const { nouns, verbs, adjs } = wordlist;
  const nounLines = nouns
    .map((n) => `${n.article} ${n.lemma}${n.plural ? ` (pl ${n.plural})` : ""}`)
    .join("\n");
  const verbLines = verbs
    .map((v) => {
      const tag =
        v.prep && v.prep_case
          ? ` [+${v.prep} ${v.prep_case}]`
          : v.object_case === "dat"
            ? " [+dat]"
            : v.object_case === "none"
              ? " [intransitive]"
              : "";
      return `${v.lemma}${tag}`;
    })
    .join("\n");
  const adjLines = adjs.map((a) => a.lemma).join("\n");

  return [
    `You are a German grammar expert creating exercises for a CEFR ${level.toUpperCase()} declension drill.

Your job: produce grammatically perfect German sentences where a noun phrase appears in a SPECIFIED case, with a verb that genuinely forces that case (either directly or via a fixed preposition).

Rules:
1. Use ONLY nouns, verbs, and adjectives from the provided word lists. Do not invent vocabulary.
2. Each sentence must be semantically natural - a real German speaker would say it.
3. The "prefix" field contains everything BEFORE the noun phrase, including trailing space.
4. The noun phrase itself (article + optional adjective + noun) is NOT in the prefix. The app inserts it at runtime.
5. The "suffix" field is the punctuation that goes AFTER the noun (almost always ".").
6. The "verb_lemma" must match the actual verb in your prefix and must justify the case:
   - Akk: suchen, kaufen, lesen, sehen, brauchen, kennen, etc.
   - Dat: helfen, danken, gefallen, gehören, gratulieren, etc.
   - Prepositional Akk: warten auf, denken an, hoffen auf, sich freuen auf, sich interessieren für
   - Prepositional Dat: sprechen mit, telefonieren mit, kommen aus, wohnen bei
   - Nom: sein, werden, bleiben (copular), or existential "Das ist", "Hier kommt"
7. Use simple present tense, first/second/third person.
8. Do NOT include the noun phrase itself in the prefix. The user fills the blank.
9. Vary sentence subjects (Ich, Du, Er, Sie, Wir).
10. Plural article_type "indefinite" does not exist in German - never use it. If asked for plural with indefinite, use "kein" or substitute "definite" with a quantity word.

EXAMPLES of the output format:

GOOD (case=akk, gender=m, article=indefinite, with_adj=true):
{
  "prefix": "Ich suche ",
  "noun_lemma": "Termin",
  "gender": "m",
  "case": "akk",
  "article_type": "indefinite",
  "adjective_lemma": "wichtig",
  "verb_lemma": "suchen",
  "suffix": "."
}
Full rendered sentence (for your reference, not in output): "Ich suche einen wichtigen Termin."

GOOD (case=dat, gender=f, article=definite, with_adj=false):
{
  "prefix": "Wir helfen ",
  "noun_lemma": "Frau",
  "gender": "f",
  "case": "dat",
  "article_type": "definite",
  "adjective_lemma": null,
  "verb_lemma": "helfen",
  "suffix": "."
}
Full rendered sentence: "Wir helfen der Frau."

BAD (article in prefix - DO NOT do this):
{ "prefix": "Ich suche einen wichtigen ", ... }   <-- WRONG: prefix must not include the noun phrase`,

    `=== ${level.toUpperCase()} NOUN POOL (${nouns.length} nouns) ===\n${nounLines}`,

    `=== ${level.toUpperCase()} VERB POOL (${verbs.length} verbs) ===\n${verbLines}`,

    `=== ${level.toUpperCase()} ADJECTIVE POOL (${adjs.length} adjectives) ===\n${adjLines}`,
  ];
}

function combos() {
  const out = [];
  for (const c of CASES) {
    for (const g of GENDERS) {
      for (const a of ARTICLE_TYPES) {
        if (g === "pl" && a === "indefinite") continue;
        for (const adj of ADJ_VARIANTS) {
          out.push({ case: c, gender: g, article_type: a, with_adjective: adj });
        }
      }
    }
  }
  return out;
}

async function generateBatch(client, systemBlocks, spec, perCombo) {
  const userMsg = `Generate exactly ${perCombo} sentences with these constraints:
- case: ${spec.case}
- gender: ${spec.gender}
- article_type: ${spec.article_type}
- with_adjective: ${spec.with_adjective}

Each sentence must be unique (different verb OR different noun OR different adjective from the others in this batch). Pick a mix of subjects (Ich/Du/Er/Sie/Wir). Output the JSON now.`;

  const system = systemBlocks.map((text, i) => ({
    type: "text",
    text,
    ...(i === systemBlocks.length - 1 ? { cache_control: { type: "ephemeral" } } : {}),
  }));

  const response = await client.messages.create({
    model: "claude-opus-4-7",
    max_tokens: 8000,
    thinking: { type: "adaptive" },
    output_config: { format: { type: "json_schema", schema: SENTENCE_SCHEMA } },
    system,
    messages: [{ role: "user", content: userMsg }],
  });

  const block = response.content.find((b) => b.type === "text");
  if (!block) throw new Error("no text block in response");
  const parsed = JSON.parse(block.text);
  return { parsed, usage: response.usage };
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv.length === 0 || !LEVELS.includes(argv[0])) {
    console.error(`Usage: node scripts/generate_sentences.mjs <a1|a2|b1> [--per-combo N]`);
    process.exit(1);
  }
  const level = argv[0];
  const perComboIdx = argv.indexOf("--per-combo");
  const perCombo = perComboIdx >= 0 ? parseInt(argv[perComboIdx + 1], 10) : 4;

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("ANTHROPIC_API_KEY not set. Run: ANTHROPIC_API_KEY=sk-ant-... node scripts/generate_sentences.mjs ...");
    process.exit(1);
  }

  const client = new Anthropic();
  const wordlist = loadWordlist(level);
  const systemBlocks = buildSystemPrompt(level, wordlist);
  const allCombos = combos();

  console.log(`Level: ${level} | Nouns: ${wordlist.nouns.length} | Verbs: ${wordlist.verbs.length} | Adj: ${wordlist.adjs.length}`);
  console.log(`Generating ${allCombos.length} combos x ${perCombo} sentences = ${allCombos.length * perCombo} target sentences`);

  const out = [];
  let totalWrite = 0;
  let totalRead = 0;
  let totalIn = 0;
  let totalOut = 0;

  for (let i = 0; i < allCombos.length; i++) {
    const spec = allCombos[i];
    process.stdout.write(
      `[${i + 1}/${allCombos.length}] ${spec.case}/${spec.gender}/${spec.article_type}/adj=${spec.with_adjective} ... `,
    );
    try {
      const { parsed, usage } = await generateBatch(client, systemBlocks, spec, perCombo);
      totalWrite += usage.cache_creation_input_tokens ?? 0;
      totalRead += usage.cache_read_input_tokens ?? 0;
      totalIn += usage.input_tokens;
      totalOut += usage.output_tokens;
      for (const s of parsed.sentences) {
        out.push({ ...s, status: "pending" });
      }
      console.log(
        `${parsed.sentences.length} ok | in=${usage.input_tokens} cache_read=${usage.cache_read_input_tokens ?? 0}`,
      );
    } catch (e) {
      console.log(`FAILED: ${e.message}`);
    }
  }

  const outPath = path.join(ROOT, "data", "sentences", `${level}.json`);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2));

  console.log(`\nWrote ${out.length} sentences to ${outPath}`);
  console.log(`Token usage: input=${totalIn} cache_write=${totalWrite} cache_read=${totalRead} output=${totalOut}`);
  const inputCost = (totalIn * 5) / 1_000_000;
  const writeCost = (totalWrite * 6.25) / 1_000_000;
  const readCost = (totalRead * 0.5) / 1_000_000;
  const outputCost = (totalOut * 25) / 1_000_000;
  console.log(`Est. cost: $${(inputCost + writeCost + readCost + outputCost).toFixed(3)}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
