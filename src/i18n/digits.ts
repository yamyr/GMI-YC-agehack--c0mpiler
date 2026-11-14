/** Convert full-width, Devanagari and Tamil decimal digits for numeric input. */
export function normalizeDecimalDigits(text: string): string {
  return text.normalize("NFKC").replace(/[\u0966-\u096f\u0be6-\u0bef]/g, (digit) => {
    const code = digit.charCodeAt(0);
    return String(code - (code >= 0x0be6 ? 0x0be6 : 0x0966));
  });
}

/** Ungrouped whole USD only: ambiguous locale separators are rejected, never reinterpreted. */
export function parseDollars(text: string): number {
  const normalized = normalizeDecimalDigits(text);
  const trimmed = normalized.trim().replace(/^\$/, "");
  return /^\d+$/.test(trimmed) ? Number(trimmed) : Number.NaN;
}
