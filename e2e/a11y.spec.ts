import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { visitEveryStep } from "./helpers";

// Constitution principle I (Older Adults First) as a failing test: every step of the walkthrough
// must pass axe's WCAG 2.1 A and AA rules, which cover colour contrast, accessible names, roles
// and labels. The 16px floor and focus rings are checked in layout.spec.ts.
test("every step passes axe's WCAG 2.1 AA checks", async ({ page }) => {
  const visited: string[] = [];
  await visitEveryStep(page, async (step) => {
    visited.push(step);
    const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    const summary = violations.map((v) => `${v.id}: ${v.help} (${v.nodes.map((n) => n.target.join(" ")).join(", ")})`);
    expect(summary, `accessibility violations on “${step}”`).toEqual([]);
  });
  // Guards the guard: if a step is added or the walk breaks, this fails instead of passing quietly.
  expect(new Set(visited).size, `distinct steps visited: ${visited.join(" | ")}`).toBe(13);
});
