#!/usr/bin/env python3
"""
Parse a Goethe wordlist PDF into a structured JSON wordlist.

Usage:
    python3 parse_wordlist.py <input.pdf> <output.json> <level>

Level: a1 | a2 | b1
"""
import json
import re
import sys
from collections import defaultdict
from pathlib import Path

import pdfplumber

# Per-file extraction config: lemma x-range per column, columns list, page range.
# page_start and page_end are 1-indexed inclusive of start, exclusive of end.
CONFIGS = {
    "a1": {
        "page_start": 9,
        "page_end": 28,
        "columns": [(0, 240)],
        "lemma_max_x": 235,
        "lemma_min_x_per_col": [140],
    },
    "a2": {
        "page_start": 8,
        "page_end": 32,
        "columns": [(0, 300), (300, 600)],
        "lemma_max_x_per_col": [105, 374],
        "lemma_min_x_per_col": [30, 300],
    },
    "b1": {
        "page_start": 16,
        "page_end": 103,
        "columns": [(0, 350), (350, 600)],
        "lemma_max_x_per_col": [140, 421],
        "lemma_min_x_per_col": [30, 370],
    },
}


def find_wordlist_pages(pdf, cfg):
    """Return (start, end) 0-indexed page range."""
    return (cfg["page_start"] - 1, cfg["page_end"] - 1)


def group_rows(words, y_tol=2.5):
    """Cluster words into rows by top coordinate."""
    rows = []
    current_top = None
    current_row = []
    for w in sorted(words, key=lambda w: (w["top"], w["x0"])):
        if current_top is None or abs(w["top"] - current_top) <= y_tol:
            current_row.append(w)
            current_top = w["top"] if current_top is None else current_top
        else:
            rows.append(current_row)
            current_row = [w]
            current_top = w["top"]
    if current_row:
        rows.append(current_row)
    return rows


def extract_lemma_lines(pdf_path, cfg):
    """Walk the wordlist pages and yield (lemma_text, indent_x) tuples in reading order."""
    with pdfplumber.open(pdf_path) as pdf:
        start, end = find_wordlist_pages(pdf, cfg)
        for page in pdf.pages[start:end]:
            words = page.extract_words(extra_attrs=["fontname", "size"])
            if not words:
                continue
            for col_idx, (col_x0, col_x1) in enumerate(cfg["columns"]):
                col_words = [w for w in words if col_x0 <= w["x0"] < col_x1]
                rows = group_rows(col_words)
                for row in rows:
                    if "lemma_max_x" in cfg:
                        lemma_max = cfg["lemma_max_x"]
                    else:
                        lemma_max = cfg["lemma_max_x_per_col"][col_idx]
                    lemma_min = cfg["lemma_min_x_per_col"][col_idx]
                    lemma_words = [
                        w for w in row if lemma_min <= w["x0"] < lemma_max
                    ]
                    if not lemma_words:
                        continue
                    lemma_words.sort(key=lambda w: w["x0"])
                    text = " ".join(w["text"] for w in lemma_words).strip()
                    if not text:
                        continue
                    indent_x = lemma_words[0]["x0"]
                    yield text, indent_x


# A verb entry in Goethe wordlists ends with "hat <past-participle>" or "ist <past-participle>".
# The past participle may start with ge- (machen → gemacht), or without ge- for verbs
# starting with be-, er-, ver-, zer-, ent-, miss-, emp-, ge- and -ieren suffix verbs.
VERB_CONJ_HINT = re.compile(
    r",\s*(hat|ist)\s+[a-zäöüß][a-zäöüß]+\s*$"
)
# A bare infinitive ends in -en or -n; covers most German verbs.
INFINITIVE_RE = re.compile(r"^[a-zäöüß][a-zäöüß\-]*(en|rn|ln)$")
ARTICLE_RE = re.compile(r"^(der|die|das)\s+(\S.+)$")
EIN_RE = re.compile(r"^(ein|eine|kein|keine)\s+(\S.+)$")
# Plural patterns: optional umlaut marker (¨), then -suffix or empty.
PLURAL_CLEAN_RE = re.compile(r"^(¨?-[a-zäöüß/\-]*|-¨[a-zäöüß]+|\(Sg\.\)|\(Pl\.\)|)")


def classify(lemma_text):
    """Return dict with type and parsed fields."""
    raw = re.sub(r"\s+", " ", lemma_text).strip()
    # Strip trailing punctuation that does not belong to the lemma.
    raw = raw.rstrip(":.,;")

    # Multi-word lemma: usually noun with article and plural.
    m = ARTICLE_RE.match(raw)
    if m:
        article = m.group(1)
        rest = m.group(2).strip()
        # Detect plural suffix: ", -e" or ", -n" or ", ¨-e" etc.
        # Strip trailing parenthetical (Sg.) (Pl.) etc.
        rest_clean = re.sub(r"\s*\([A-Za-z\.]+\)\s*$", "", rest).strip().rstrip(",")
        # Try to split noun and plural marker after first comma.
        if "," in rest_clean:
            head, _, tail = rest_clean.partition(",")
            noun = head.strip()
            plural_raw = tail.strip()
            m_plural = PLURAL_CLEAN_RE.match(plural_raw)
            plural = m_plural.group(1) if m_plural and m_plural.group(1) else None
        else:
            noun = rest_clean
            plural = None
        gender = {"der": "m", "die": "f", "das": "n"}[article]
        return {
            "type": "noun",
            "lemma": noun,
            "article": article,
            "gender": gender,
            "plural": plural,
            "raw": raw,
        }

    # Verb: has conjugation marker (multi-form entry from A2/B1).
    if VERB_CONJ_HINT.search(raw):
        infinitive = raw.split(",", 1)[0].strip()
        return {
            "type": "verb",
            "lemma": infinitive,
            "forms": raw,
            "raw": raw,
        }

    # Single-token entry: distinguish verb infinitive from adjective by suffix.
    if re.match(r"^[a-zäöüß][a-zäöüß\-]*$", raw):
        if INFINITIVE_RE.match(raw):
            return {
                "type": "verb",
                "lemma": raw,
                "forms": None,
                "raw": raw,
            }
        return {
            "type": "adjective",
            "lemma": raw,
            "raw": raw,
        }

    # Hyphenated stems like "all-", "ander-" — keep as adjective placeholders.
    if re.match(r"^[a-zäöüß][a-zäöüß\-]*\-$", raw):
        return {
            "type": "adjective",
            "lemma": raw,
            "raw": raw,
        }

    return {
        "type": "other",
        "lemma": raw,
        "raw": raw,
    }


def parse(pdf_path, level):
    cfg = CONFIGS[level]
    rows = []
    for text, indent_x in extract_lemma_lines(pdf_path, cfg):
        # Skip obvious headers and page artifacts.
        if re.match(r"^[A-Z]$", text) or re.match(r"^\d+$", text):
            continue
        if "WORTLISTE" in text or "Wortliste" in text or "alphabetische" in text.lower():
            continue
        if "GOETHE" in text or "ZERTIFIKAT" in text or text.startswith("VS_"):
            continue
        # Skip lone numbered example markers like "1." or "2."
        if re.match(r"^\d+\.?$", text):
            continue
        rows.append(text)

    # Merge continuation lines: a row that ends with "," continues into the next row.
    merged = []
    buffer = ""
    for r in rows:
        if buffer:
            buffer = buffer + " " + r
        else:
            buffer = r
        if not buffer.rstrip().endswith(","):
            merged.append(buffer.strip())
            buffer = ""
    if buffer:
        merged.append(buffer.strip())

    parsed = []
    for raw in merged:
        item = classify(raw)
        parsed.append(item)
    return parsed


VALID_PLURAL_RE = re.compile(r"^(¨?-[a-zäöüß/\-]*|-¨[a-zäöüß]+)?$")
CLEAN_NOUN_RE = re.compile(r"^[A-ZÄÖÜ][a-zäöüßA-ZÄÖÜ\-]+$")
CLEAN_VERB_RE = re.compile(r"^[a-zäöüß][a-zäöüß\-]*(en|rn|ln)$")
CLEAN_ADJ_RE = re.compile(r"^[a-zäöüß][a-zäöüß\-]*\-?$")


def is_clean(entry):
    """Return True if the entry looks well-formed enough to use."""
    if entry["type"] == "noun":
        if not CLEAN_NOUN_RE.match(entry["lemma"]):
            return False
        if entry.get("plural") and not VALID_PLURAL_RE.match(entry["plural"]):
            return False
        return True
    if entry["type"] == "verb":
        return bool(CLEAN_VERB_RE.match(entry["lemma"]))
    if entry["type"] == "adjective":
        return bool(CLEAN_ADJ_RE.match(entry["lemma"]))
    return False


def main():
    if len(sys.argv) != 4:
        print(__doc__)
        sys.exit(1)
    pdf_path, out_path, level = sys.argv[1], sys.argv[2], sys.argv[3].lower()
    if level not in CONFIGS:
        print(f"Unknown level {level}")
        sys.exit(1)

    parsed = parse(pdf_path, level)
    for p in parsed:
        p["level"] = level

    # Keep only clean entries; drop "other" and malformed.
    clean = [p for p in parsed if is_clean(p)]

    # De-duplicate by (type, lemma).
    seen = set()
    deduped = []
    for p in clean:
        key = (p["type"], p["lemma"])
        if key in seen:
            continue
        seen.add(key)
        deduped.append(p)

    Path(out_path).write_text(json.dumps(deduped, ensure_ascii=False, indent=2))
    counts = defaultdict(int)
    for p in deduped:
        counts[p["type"]] += 1
    dropped = len(parsed) - len(deduped)
    print(f"Wrote {len(deduped)} clean entries to {out_path} (dropped {dropped} noisy)")
    for k, v in sorted(counts.items()):
        print(f"  {k}: {v}")


if __name__ == "__main__":
    main()
