import { describe, expect, it } from "vitest";
import { CATALOGUE, displaySkillLabel, findSkills, skillByTag } from "./catalogue";

describe("skill catalogue", () => {
  it("has unique tags, each with a label and at least one keyword", () => {
    const tags = CATALOGUE.map((s) => s.tag);
    expect(new Set(tags).size).toBe(tags.length);
    for (const skill of CATALOGUE) {
      expect(skill.label.length).toBeGreaterThan(2);
      expect(skill.keywords.length).toBeGreaterThan(0);
    }
  });

  it("keeps the tags the walkthrough already matches on", () => {
    for (const tag of ["contract-manufacturing", "supplier-negotiation", "supplier-audits", "cost-down"]) {
      expect(skillByTag(tag)).toBeDefined();
    }
  });

  it("finds skills from what a person says, in catalogue order, whatever the case", () => {
    const found = findSkills("I negotiated with SUPPLIERS for years and ran the payroll and bookkeeping.");
    expect(found.map((s) => s.tag)).toEqual(["supplier-negotiation", "bookkeeping"]);
  });

  it("matches whole words, so 'sales' is not found inside 'wholesalers'", () => {
    expect(findSkills("We bought from wholesalers.").map((s) => s.tag)).not.toContain("sales");
  });

  it("finds nothing in text that names no skill", () => {
    expect(findSkills("I enjoy gardening.")).toEqual([]);
    expect(findSkills("")).toEqual([]);
  });
  it("recognizes the translated catalogue label in a typed brief", () => {
    expect(findSkills("J'ai besoin d'aide avec la négociation avec les fournisseurs.", "fr").map((skill) => skill.tag))
      .toEqual(["supplier-negotiation"]);
  });

  it("preserves a user's edited label even when it matches a catalogue string", () => {
    const skill = { tag: "supplier-negotiation", label: "Supplier negotiation" };
    expect(displaySkillLabel({ ...skill, source: { kind: "edited" } }, "fr")).toBe("Supplier negotiation");
    expect(displaySkillLabel({ ...skill, source: { kind: "interview", turn: 1 } }, "fr")).toBe("Négociation avec les fournisseurs");
  });

});
