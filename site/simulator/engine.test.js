import { describe, expect, it } from "vitest";
import {
  GOALS,
  OUTCOMES,
  PARAMS,
  PRESETS,
  defaults,
  demandWeights,
  diagnose,
  normalise,
  overlap,
  randomScenario,
  simulate,
  summarise,
} from "./engine.js";

describe("simulator engine", () => {
  it("replays the same market for the same seed", () => {
    const a = summarise(simulate({ seed: 7 }));
    const b = summarise(simulate({ seed: 7 }));
    expect(a).toEqual(b);
    expect(summarise(simulate({ seed: 8 })).earned).not.toBe(a.earned);
  });

  it("accounts for every request exactly once", () => {
    for (const preset of PRESETS) {
      const result = simulate(preset.params);
      for (const week of result.weeks) {
        expect(OUTCOMES.reduce((n, o) => n + week[o], 0)).toBe(week.requests);
      }
    }
  });

  it("splits what buyers pay between experts and the fee", () => {
    const result = simulate({ fee: 20 });
    const s = summarise(result);
    const paid = result.weeks.reduce((n, w) => n + w.paid, 0);
    expect(s.earned + s.fees).toBeCloseTo(paid, 6);
    expect(s.fees).toBeCloseTo(paid * 0.2, 6);
    expect(result.experts.reduce((n, e) => n + e.earned, 0)).toBeCloseTo(s.earned, 6);
  });

  it("never books an expert beyond their weekly capacity", () => {
    const result = simulate({ experts: 10, requests: 400, weeks: 4 });
    for (const e of result.experts) expect(e.sessions).toBeLessThanOrEqual(e.capacity * 4);
  });

  it("fails on price when budgets sit below expert prices", () => {
    const s = summarise(simulate({ expertPrice: 150, budget: 30, expertFlex: 5, budgetFlex: 5 }));
    expect(s.counts.price / s.requests).toBeGreaterThan(0.9);
    expect(diagnose(s, normalise({ expertPrice: 150, budget: 30 }))).toMatch(/fail on price/);
  });

  it("fails on capacity when buyers far outnumber experts", () => {
    const s = summarise(simulate({ experts: 5, requests: 400, capacity: 1, skills: 2 }));
    expect(s.counts.busy).toBeGreaterThan(s.counts.matched);
  });

  it("uses engines only when switched on, and only for experts with a workflow", () => {
    const base = { experts: 10, requests: 300, capacity: 2, approval: 100 };
    expect(summarise(simulate(base)).counts.engine).toBe(0);
    const withEngine = simulate({ ...base, engine: true });
    expect(summarise(withEngine).counts.engine).toBeGreaterThan(0);
    for (const e of withEngine.experts) if (e.engineSessions > 0) expect(e.workflows).toBeGreaterThan(0);
  });

  it("reaches more experts when work is spread", () => {
    const base = { experts: 60, requests: 60, weeks: 8 };
    const best = summarise(simulate(base)).earningShare;
    const spread = summarise(simulate({ ...base, spread: true })).earningShare;
    expect(spread).toBeGreaterThan(best);
  });

  it("clamps out-of-range and junk parameters", () => {
    const p = normalise({ experts: 99999, fee: -5, weeks: "abc", seed: "12", spread: "1" });
    expect(p.experts).toBe(200);
    expect(p.fee).toBe(0);
    expect(p.weeks).toBe(defaults().weeks);
    expect(p.seed).toBe(12);
    expect(p.spread).toBe(true);
  });

  it("generates random scenarios inside every parameter's range", () => {
    for (let seed = 1; seed <= 50; seed++) {
      const p = randomScenario(seed);
      for (const d of PARAMS) {
        expect(p[d.key]).toBeGreaterThanOrEqual(d.min);
        expect(p[d.key]).toBeLessThanOrEqual(d.max);
      }
    }
  });

  it("has presets that pass and presets that fail the goals", () => {
    const passed = PRESETS.map((preset) => {
      const s = summarise(simulate(preset.params));
      return GOALS.filter((g) => g.test(s)).length;
    });
    expect(passed[0]).toBe(GOALS.length); // the balanced market is winnable as given
    expect(passed.slice(1).every((n) => n < GOALS.length)).toBe(true);
  });

  it("computes overlaps and demand weights as documented", () => {
    expect(overlap({ min: 60, max: 90 }, { min: 50, max: 100 })).toEqual({ min: 60, max: 90 });
    expect(overlap({ min: 120, max: 160 }, { min: 50, max: 100 })).toBeNull();
    expect(new Set(demandWeights(4, 0)).size).toBe(1);
    const skewed = demandWeights(4, 100);
    expect(skewed[0]).toBeGreaterThan(skewed[3] * 10);
  });
});
