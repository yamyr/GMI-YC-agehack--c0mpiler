import { describe, expect, it } from "vitest";
import { contains, formatRange, overlap, validateRange } from "./price";

describe("validateRange", () => {
  it("accepts whole dollars of at least $1 with min ≤ max", () => {
    expect(validateRange({ min: 60, max: 90 })).toEqual({ ok: true, range: { min: 60, max: 90 } });
    expect(validateRange({ min: 1, max: 1 })).toEqual({ ok: true, range: { min: 1, max: 1 } });
  });

  it("explains a minimum above the maximum in plain language", () => {
    const result = validateRange({ min: 90, max: 60 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toMatch(/\$90.*higher.*\$60/);
  });

  it.each([
    [{ min: 0, max: 50 }],
    [{ min: -5, max: 50 }],
    [{ min: 10, max: 0 }],
  ])("rejects amounts below $1: %o", (range) => {
    const result = validateRange(range);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toMatch(/at least \$1/);
  });

  it.each([
    [{ min: 10.5, max: 50 }],
    [{ min: Number.NaN, max: 50 }],
    [{ min: 10, max: Number.POSITIVE_INFINITY }],
  ])("rejects amounts that are not whole dollars: %o", (range) => {
    const result = validateRange(range);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toMatch(/whole dollar/);
  });
});

describe("overlap", () => {
  it("returns the shared part of two ranges", () => {
    expect(overlap({ min: 60, max: 90 }, { min: 50, max: 100 })).toEqual({ min: 60, max: 90 });
    expect(overlap({ min: 65, max: 95 }, { min: 50, max: 100 })).toEqual({ min: 65, max: 95 });
  });

  it("returns null when the ranges do not meet", () => {
    expect(overlap({ min: 40, max: 60 }, { min: 70, max: 80 })).toBeNull();
    expect(overlap({ min: 120, max: 160 }, { min: 50, max: 100 })).toBeNull();
  });

  it("treats touching ranges as overlapping at one price", () => {
    expect(overlap({ min: 50, max: 60 }, { min: 60, max: 70 })).toEqual({ min: 60, max: 60 });
  });
});

describe("contains", () => {
  it("is inclusive at both ends", () => {
    const range = { min: 60, max: 90 };
    expect(contains(range, 60)).toBe(true);
    expect(contains(range, 90)).toBe(true);
    expect(contains(range, 75)).toBe(true);
    expect(contains(range, 59)).toBe(false);
    expect(contains(range, 95)).toBe(false);
  });
});

describe("formatRange", () => {
  it("formats as dollars with an en dash", () => {
    expect(formatRange({ min: 60, max: 90 })).toBe("$60–$90");
    expect(formatRange({ min: 1000, max: 1500 })).toBe("$1,000–$1,500");
  });
});
