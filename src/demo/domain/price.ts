import { formatUsd } from "./money";
import type { PriceRange } from "./types";

export type RangeCheck =
  | { readonly ok: true; readonly range: PriceRange }
  | { readonly ok: false; readonly message: string };

/** FR-011: whole dollars, at least $1, min ≤ max — explained in plain language. */
export function validateRange(range: PriceRange): RangeCheck {
  const { min, max } = range;
  if (!Number.isInteger(min) || !Number.isInteger(max)) {
    return { ok: false, message: "Please use whole dollar amounts, like 60 or 90." };
  }
  if (min < 1 || max < 1) {
    return { ok: false, message: "Both prices must be at least $1." };
  }
  if (min > max) {
    return {
      ok: false,
      message: `The lowest price (${formatUsd(min)}) is higher than the highest (${formatUsd(max)}). Swap them, or change one.`,
    };
  }
  return { ok: true, range: { min, max } };
}

/** The shared part of two ranges, or null when they do not meet. */
export function overlap(a: PriceRange, b: PriceRange): PriceRange | null {
  const min = Math.max(a.min, b.min);
  const max = Math.min(a.max, b.max);
  return min <= max ? { min, max } : null;
}

export function contains(range: PriceRange, amount: number): boolean {
  return amount >= range.min && amount <= range.max;
}

export function formatRange(range: PriceRange): string {
  return `${formatUsd(range.min)}–${formatUsd(range.max)}`;
}
