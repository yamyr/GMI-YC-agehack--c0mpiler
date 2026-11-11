import { describe, expect, it } from "vitest";
import { proposalTotal, validateProposal } from "./proposal";

const OVERLAP = { min: 60, max: 90 };

describe("proposalTotal", () => {
  it("multiplies units by the price per unit", () => {
    expect(proposalTotal(2, 75)).toBe(150);
    expect(proposalTotal(4, 60)).toBe(240);
  });
});

describe("validateProposal", () => {
  it("accepts prices inside the shared range, inclusive", () => {
    expect(validateProposal(75, OVERLAP)).toEqual({ ok: true });
    expect(validateProposal(60, OVERLAP)).toEqual({ ok: true });
    expect(validateProposal(90, OVERLAP)).toEqual({ ok: true });
  });

  it("flags a price outside the shared range and names the range", () => {
    const result = validateProposal(95, OVERLAP);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toMatch(/\$95.*\$60–\$90/);
  });

  it.each([0, -10, 70.5, Number.NaN])("rejects %s as not a whole-dollar price", (price) => {
    const result = validateProposal(price, OVERLAP);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toMatch(/whole-dollar/);
  });
});
