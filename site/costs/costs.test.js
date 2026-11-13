import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const costs = JSON.parse(readFileSync(new URL("./costs.json", import.meta.url), "utf8"));

// The ledger is public, so its rules are enforced: nothing is a bare number.
describe("cost ledger", () => {
  it("gives every entry a known kind, a category and an explanation", () => {
    for (const e of costs.entries) {
      expect(Object.keys(costs.kinds), e.item).toContain(e.kind);
      expect(e.category, e.item).toBeTruthy();
      expect(e.method?.length, e.item).toBeGreaterThan(20);
    }
  });

  it("has an amount and a date for everything except missing entries", () => {
    for (const e of costs.entries) {
      if (e.kind === "missing") {
        expect(e.amount, e.item).toBeNull();
      } else {
        expect(typeof e.amount, e.item).toBe("number");
        expect(e.amount, e.item).toBeGreaterThanOrEqual(0);
        expect(e.date, e.item).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
      if (e.kind === "free") expect(e.amount, e.item).toBe(0);
    }
  });

  it("requires a receipt reference for money actually paid", () => {
    for (const e of costs.entries.filter((x) => x.kind === "paid")) {
      expect(e.evidence, e.item).toBeTruthy();
    }
  });

  it("keeps the AI estimates equal to the usage table they come from", () => {
    const estimated = costs.entries.filter((e) => e.category === "AI coding agents" && e.kind === "estimate").reduce((n, e) => n + e.amount, 0);
    const usage = costs.aiUsage.models.reduce((n, m) => n + m.listPriceUsd, 0);
    expect(estimated).toBeCloseTo(usage, 2);
  });
});
