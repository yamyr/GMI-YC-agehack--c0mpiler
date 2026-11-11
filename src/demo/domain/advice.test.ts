import { describe, expect, it } from "vitest";
import { DEV_BRIEF } from "../script/dev";
import { detectRestrictedAdvice, restrictedAdviceMessage } from "./advice";

describe("detectRestrictedAdvice", () => {
  it.each([
    ["I need legal advice about my contract", "legal"],
    ["Can a lawyer look at this?", "legal"],
    ["We may face a LAWSUIT", "legal"],
    ["Should I sue my supplier?", "legal"],
    ["Help me diagnose my back pain", "medical"],
    ["Which medication should I take?", "medical"],
    ["My symptoms are getting worse", "medical"],
    ["What treatment is best?", "medical"],
    ["I want investment advice", "financial"],
    ["Which stocks should I buy?", "financial"],
    ["I need tax advice", "financial"],
    ["How should I invest my retirement savings?", "financial"],
  ] as const)("flags %j as %s", (text, category) => {
    expect(detectRestrictedAdvice(text)).toBe(category);
  });

  it("does not flag ordinary business problems", () => {
    expect(detectRestrictedAdvice(DEV_BRIEF.problem)).toBeNull();
    expect(detectRestrictedAdvice("Negotiate tooling ownership and payment terms")).toBeNull();
  });

  it("explains that Agely does not offer that kind of advice", () => {
    expect(restrictedAdviceMessage("legal")).toMatch(/doesn't offer legal advice/);
  });
});
