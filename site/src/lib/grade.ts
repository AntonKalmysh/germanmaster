import {
  CASE_LABEL,
  GENDER_LABEL,
  PATTERN_LABEL,
  matchesAdjEnding,
  matchesArticle,
} from "./declension";
import type {
  Answer,
  Exercise,
  GradeResult,
  ErrorKind,
} from "./types";

function norm(s: string) {
  return s.trim().toLowerCase().replace(/^-/, "");
}

/** Compare two strings ignoring case and surrounding whitespace; "" matches "—" or "-". */
function endingEquals(user: string, expected: string) {
  const u = norm(user);
  const e = norm(expected);
  if (e === "" && (u === "" || u === "—")) return true;
  return u === e;
}

/**
 * Grade a user's answer for one exercise and attribute any errors.
 * Attribution heuristic:
 *  - "case": user's input matches a different case for the same gender + pattern
 *  - "gender": input matches a different gender for the same case + pattern
 *  - "pattern": adjective ending matches a different pattern for the same case + gender
 *  - "unknown": none of the above
 */
export function grade(exercise: Exercise, answer: Answer): GradeResult {
  const perBlank: GradeResult["perBlank"] = [];
  let anyWrong = false;
  const attributions: ErrorKind[] = [];

  for (const blank of exercise.blanks) {
    const user = answer[blank.id] ?? "";
    const correct = endingEquals(user, blank.expected);
    let errorKind: ErrorKind | undefined;
    if (!correct) {
      anyWrong = true;
      errorKind = attributeError(blank, user, exercise);
      attributions.push(errorKind);
    }
    perBlank.push({
      blankId: blank.id,
      user,
      expected: blank.expected,
      correct,
      errorKind,
    });
  }

  const result: GradeResult = {
    correct: !anyWrong,
    perBlank,
  };
  if (anyWrong) {
    // Prefer a more specific attribution: case/gender/pattern over unknown.
    const priority: ErrorKind[] = ["case", "gender", "pattern", "unknown"];
    for (const k of priority) {
      if (attributions.includes(k)) {
        result.attribution = k;
        break;
      }
    }
    result.explanation = explain(exercise, perBlank);
  }
  return result;
}

function attributeError(
  blank: Exercise["blanks"][number],
  user: string,
  exercise: Exercise,
): ErrorKind {
  const u = norm(user);
  if (blank.kind === "article") {
    const matches = matchesArticle("d" + u, exercise.articleType).concat(
      matchesArticle(
        exercise.articleType === "indefinite"
          ? "ein" + u
          : exercise.articleType === "kein"
          ? "kein" + u
          : u,
        exercise.articleType,
      ),
    );
    for (const m of matches) {
      if (m.case !== exercise.case && m.gender === exercise.gender) return "case";
      if (m.case === exercise.case && m.gender !== exercise.gender) return "gender";
    }
    return "unknown";
  }
  // adj_ending
  const matches = matchesAdjEnding(u);
  for (const m of matches) {
    if (
      m.pattern === exercise.pattern &&
      m.gender === exercise.gender &&
      m.case !== exercise.case
    )
      return "case";
    if (
      m.pattern === exercise.pattern &&
      m.case === exercise.case &&
      m.gender !== exercise.gender
    )
      return "gender";
    if (
      m.pattern !== exercise.pattern &&
      m.case === exercise.case &&
      m.gender === exercise.gender
    )
      return "pattern";
  }
  return "unknown";
}

function explain(
  exercise: Exercise,
  perBlank: GradeResult["perBlank"],
): string {
  const wrong = perBlank.find((b) => !b.correct);
  if (!wrong) return "";
  const expected = wrong.expected || "(no ending)";
  const kindLabel = wrong.errorKind ?? "unknown";
  const detail =
    `${CASE_LABEL[exercise.case]} · ${GENDER_LABEL[exercise.gender]} · ${PATTERN_LABEL[exercise.pattern]}`;
  return `Expected "${expected}". (${kindLabel} error · ${detail})`;
}
