"use client";
import { forwardRef, type InputHTMLAttributes } from "react";
import type { Gender } from "@/lib/types";
import { genderColor } from "./GenderSwatch";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  gender: Gender;
  status?: "neutral" | "correct" | "wrong";
  width?: number;
};

export const BlankInput = forwardRef<HTMLInputElement, Props>(
  function BlankInput(
    { gender, status = "neutral", width = 56, style, className = "", ...rest },
    ref,
  ) {
    const borderColor =
      status === "correct"
        ? "var(--ok)"
        : status === "wrong"
        ? "var(--error)"
        : "var(--line-strong)";
    return (
      <input
        ref={ref}
        autoCapitalize="off"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        type="text"
        className={`blank-input mx-1 inline-block rounded-md border bg-white px-2 py-1 text-center text-base leading-none outline-none transition-colors focus:border-[3px] ${className}`}
        style={{
          width,
          borderColor,
          // Active focus border uses gender color (drawn on focus by the focus border var).
          // We use a CSS var on the element so we can drive focus color from props.
          ["--focus-color" as string]: genderColor(gender),
          ...(style ?? {}),
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = genderColor(gender);
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = borderColor;
        }}
        {...rest}
      />
    );
  },
);
