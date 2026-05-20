import type { ArticleType } from "./types";

/**
 * Split an article form into a stem (rendered as-is) and an ending (the blank).
 *
 * Definite "der" → { stem: "d", ending: "er" }
 * Indefinite "einem" → { stem: "ein", ending: "em" }
 * Kein "keine" → { stem: "kein", ending: "e" }
 * No article ("") → { stem: "", ending: "" }
 */
export function splitArticle(
  form: string,
  type: ArticleType,
): { stem: string; ending: string } {
  if (type === "none" || form === "") return { stem: "", ending: "" };
  if (type === "definite") {
    return { stem: "d", ending: form.slice(1) };
  }
  if (type === "indefinite") {
    return { stem: "ein", ending: form.slice(3) };
  }
  if (type === "kein") {
    return { stem: "kein", ending: form.slice(4) };
  }
  return { stem: form, ending: "" };
}
