import { describe, expect, it } from "vitest";
import { FEE_PERCENT, feeCents, formatCents, owedCents, sessionTotalCents } from "./money";

describe("money", () => {
  it("totals a session in cents from whole-dollar prices per 15 minutes", () => {
    expect(sessionTotalCents(2, 75)).toBe(15_000);
    expect(sessionTotalCents(1, 65)).toBe(6_500);
  });

  it("refuses units and prices that are not positive whole numbers", () => {
    for (const [units, price] of [[0, 75], [1.5, 75], [2, 0], [2, 74.5], [-1, 75]] as const) {
      expect(() => sessionTotalCents(units, price)).toThrow();
    }
  });

  it("takes a 10% fee, rounded half up to the cent", () => {
    expect(FEE_PERCENT).toBe(10);
    expect(feeCents(15_000)).toBe(1_500);
    expect(feeCents(6_500)).toBe(650);
    expect(feeCents(6_505)).toBe(651); // 650.5 rounds up
    expect(feeCents(6_504)).toBe(650);
  });

  it("never loses a cent between the fee and what is owed", () => {
    for (let cents = 1; cents <= 20_000; cents += 37) {
      expect(feeCents(cents) + owedCents(cents)).toBe(cents);
    }
  });

  it("formats cents as dollars, showing cents only when there are some", () => {
    expect(formatCents(15_000)).toBe("$150");
    expect(formatCents(13_500)).toBe("$135");
    expect(formatCents(5_850)).toBe("$58.50");
    expect(formatCents(123_456)).toBe("$1,234.56");
  });
});
