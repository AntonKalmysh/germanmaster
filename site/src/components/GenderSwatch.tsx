import type { Gender } from "@/lib/types";

const COLOR_VAR: Record<Gender, string> = {
  m: "var(--gender-m)",
  f: "var(--gender-f)",
  n: "var(--gender-n)",
  pl: "var(--gender-pl)",
};

const LABEL: Record<Gender, string> = {
  m: "der",
  f: "die",
  n: "das",
  pl: "die",
};

export function GenderSwatch({ gender, size = 10 }: { gender: Gender; size?: number }) {
  return (
    <span
      aria-label={`gender ${LABEL[gender]}`}
      title={LABEL[gender]}
      className="inline-block align-middle rounded-full"
      style={{
        width: size,
        height: size,
        background: COLOR_VAR[gender],
      }}
    />
  );
}

export function genderColor(gender: Gender) {
  return COLOR_VAR[gender];
}
