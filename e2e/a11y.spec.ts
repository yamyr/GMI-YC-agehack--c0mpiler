import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { CHAPTER_NAMES } from "./helpers";

// Constitution principle I (Older Adults First) as a failing test: every chapter of the
// walkthrough must pass axe's WCAG 2.1 A and AA rules, which cover colour contrast, accessible
// names, roles and labels. The 16px floor and focus rings are checked in layout.spec.ts.
test("every chapter passes axe's WCAG 2.1 AA checks", async ({ page }) => {
  await page.goto("/");
  for (const chapter of ["start", ...CHAPTER_NAMES] as const) {
    if (chapter !== "start") {
      await page.getByRole("navigation", { name: "Chapters" }).getByRole("button", { name: chapter, exact: true }).click();
    }
    const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    const summary = violations.map((v) => `${v.id}: ${v.help} (${v.nodes.map((n) => n.target.join(" ")).join(", ")})`);
    expect(summary, `accessibility violations on ${chapter}`).toEqual([]);
  }
});
