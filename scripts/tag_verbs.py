#!/usr/bin/env python3
"""
Tag each verb in the wordlist JSONs with required case metadata.

Output schema added to each verb entry:
  object_case: "akk" | "dat" | "gen" | "none"  (direct object case; "none" for intransitive)
  prep: optional fixed preposition (e.g., "auf", "an", "mit")
  prep_case: optional "akk" | "dat" required by the preposition

Run:
    python3 tag_verbs.py
"""
import json
from pathlib import Path


# Common dative verbs in A1-B2 range. The verb governs a dative object.
# Source: standard German pedagogy lists (Duden, Hueber, Schubert).
DATIVE_VERBS = {
    "antworten", "begegnen", "danken", "dienen", "drohen",
    "einfallen", "fehlen", "folgen", "gefallen", "gehorchen",
    "gehören", "geschehen", "glauben", "gleichen", "gratulieren",
    "helfen", "imponieren", "leid tun", "misslingen", "missfallen",
    "nützen", "passen", "passieren", "raten", "schaden",
    "schmecken", "trauen", "vertrauen", "verzeihen", "weh tun",
    "widersprechen", "zuhören", "zusehen", "zustimmen",
    # Common reflexive/light dative
    "ähneln", "begegnen", "beistehen",
}

# Verbs with a fixed prepositional object. Each: (preposition, case).
# Case "akk" or "dat" determined by the preposition's usage with this verb.
PREP_VERBS = {
    "warten":      ("auf", "akk"),
    "denken":      ("an", "akk"),
    "sich erinnern": ("an", "akk"),
    "sich freuen": ("auf", "akk"),       # auf = looking forward; über for already happened
    "sich interessieren": ("für", "akk"),
    "sich kümmern": ("um", "akk"),
    "sich verlieben": ("in", "akk"),
    "achten":      ("auf", "akk"),
    "antworten":   ("auf", "akk"),
    "bitten":      ("um", "akk"),
    "hoffen":      ("auf", "akk"),
    "schreiben":   ("an", "akk"),
    "sprechen":    ("mit", "dat"),       # mit immer Dativ
    "reden":       ("mit", "dat"),
    "telefonieren": ("mit", "dat"),
    "sich beschäftigen": ("mit", "dat"),
    "sich treffen": ("mit", "dat"),
    "diskutieren": ("über", "akk"),
    "sich ärgern": ("über", "akk"),
    "sich beschweren": ("über", "akk"),
    "lachen":      ("über", "akk"),
    "nachdenken":  ("über", "akk"),
    "berichten":   ("über", "akk"),
    "abhängen":    ("von", "dat"),
    "träumen":     ("von", "dat"),
    "sich verabschieden": ("von", "dat"),
    "sich entscheiden": ("für", "akk"),
    "sich entschuldigen": ("für", "akk"),
    "bestehen":    ("aus", "dat"),       # bestehen aus = to consist of
    "sich gewöhnen": ("an", "akk"),
    "teilnehmen":  ("an", "dat"),
    "leiden":      ("unter", "dat"),
    "passen":      ("zu", "dat"),
    "gehören":     ("zu", "dat"),
}

# Verbs that take NO object (intransitive). Many A1 verbs are intransitive.
INTRANSITIVE_VERBS = {
    "schlafen", "wohnen", "leben", "arbeiten", "kommen", "gehen",
    "fahren", "fliegen", "laufen", "rennen", "schwimmen", "tanzen",
    "lachen", "weinen", "lächeln", "husten", "niesen",
    "bleiben", "sterben", "geboren werden", "passieren", "geschehen",
    "regnen", "schneien", "blitzen", "donnern",
    "aufstehen", "einschlafen", "aufwachen", "umziehen",
    "spazieren gehen", "joggen",
}


def tag(entry):
    """Add object_case + optional prep/prep_case to a verb entry."""
    lemma = entry["lemma"]

    # Check prep verbs first (more specific).
    if lemma in PREP_VERBS:
        prep, prep_case = PREP_VERBS[lemma]
        entry["object_case"] = "none"
        entry["prep"] = prep
        entry["prep_case"] = prep_case
        return entry

    if lemma in DATIVE_VERBS:
        entry["object_case"] = "dat"
        return entry

    if lemma in INTRANSITIVE_VERBS:
        entry["object_case"] = "none"
        return entry

    # Default: transitive accusative. The vast majority of German verbs.
    entry["object_case"] = "akk"
    return entry


def main():
    root = Path(__file__).resolve().parent.parent / "data" / "wordlists"
    for level in ("a1", "a2", "b1"):
        path = root / f"{level}.json"
        data = json.loads(path.read_text())
        tagged = 0
        for e in data:
            if e["type"] == "verb":
                tag(e)
                tagged += 1
        path.write_text(json.dumps(data, ensure_ascii=False, indent=2))
        # Stats
        verbs = [e for e in data if e["type"] == "verb"]
        by_case = {}
        for v in verbs:
            k = v["object_case"]
            by_case[k] = by_case.get(k, 0) + 1
        prep_count = sum(1 for v in verbs if v.get("prep"))
        print(f"{level}: tagged {tagged} verbs | by_case={by_case} | prep={prep_count}")


if __name__ == "__main__":
    main()
