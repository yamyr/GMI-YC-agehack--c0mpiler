import { describe, expect, it } from "vitest";
import { DEV_BRIEF } from "../script/dev";
import { OTHER_EXPERTS } from "../script/experts";
import { MARGARET_DRAFT } from "../script/margaret";
import { matchBrief } from "./match";
import type { Brief, Expert } from "./types";

const margaret: Expert = { ...MARGARET_DRAFT, published: true, priceRange: { min: 60, max: 90 } };
const brief: Brief = { ...DEV_BRIEF, confirmed: true };
const byName = (name: string) => (entry: { expert: Expert }) => entry.expert.name.startsWith(name);

describe("matchBrief", () => {
  it("matches Margaret on competency and price overlap, and explains why", () => {
    const result = matchBrief(brief, [margaret, ...OTHER_EXPERTS]);
    expect(result.kind).toBe("match");
    if (result.kind !== "match") return;
    expect(result.expert.id).toBe("margaret");
    expect(result.overlap).toEqual({ min: 60, max: 90 });
    expect(result.matchedCompetencies.map((c) => c.tag)).toEqual(["contract-manufacturing"]);
    expect(result.explanation.join(" ")).toContain("Contract manufacturing terms");
    expect(result.explanation.join(" ")).toContain("$60–$90");
  });

  it("says why the others were not matched", () => {
    const result = matchBrief(brief, [margaret, ...OTHER_EXPERTS]);
    expect(result.others.find(byName("Harold"))?.reason).toBe("competency");
    expect(result.others.find(byName("Lin"))?.reason).toBe("price");
  });

  it("skips unpublished experts and experts without a confirmed price", () => {
    const draft = { ...margaret, published: false };
    const unpriced = { ...margaret, priceRange: null };
    expect(matchBrief(brief, [draft]).others[0]?.reason).toBe("unpublished");
    expect(matchBrief(brief, [unpriced]).others[0]?.reason).toBe("unpublished");
  });

  it("ranks by overlap width, then years of experience", () => {
    const narrow: Expert = { ...margaret, id: "narrow", name: "Narrow", priceRange: { min: 95, max: 100 } };
    const senior: Expert = { ...margaret, id: "senior", name: "Senior", yearsExperience: 40 };
    const result = matchBrief(brief, [narrow, margaret, senior]);
    if (result.kind !== "match") throw new Error("expected a match");
    expect(result.expert.id).toBe("senior");
    expect(result.others.map((o) => [o.expert.id, o.reason])).toEqual([
      ["margaret", "ranked"],
      ["narrow", "ranked"],
    ]);
  });

  it("reports a competency gap when nobody has the competency", () => {
    const result = matchBrief(brief, [OTHER_EXPERTS[0] as Expert]);
    expect(result).toMatchObject({ kind: "none", reason: "competency" });
    if (result.kind === "none") expect(result.explanation).toContain("Contract manufacturing terms");
  });

  it("reports a price gap when the competency exists but the prices do not overlap", () => {
    const result = matchBrief(brief, OTHER_EXPERTS);
    expect(result).toMatchObject({ kind: "none", reason: "price" });
    if (result.kind === "none") expect(result.explanation).toContain("$50–$100");
  });
});
