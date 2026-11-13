import { type Page, expect } from "@playwright/test";

export const CHAPTER_NAMES = [
  "Margaret onboards",
  "Price",
  "Dev's brief",
  "Match",
  "Book & pay",
  "Debrief",
  "Engine",
] as const;

export async function start(page: Page): Promise<void> {
  await page.goto("/");
  await page.getByRole("button", { name: "Start the walkthrough" }).click();
}

export async function jumpTo(page: Page, chapter: (typeof CHAPTER_NAMES)[number]): Promise<void> {
  await page.goto("/");
  await page.getByRole("navigation", { name: "Chapters" }).getByRole("button", { name: chapter, exact: true }).click();
}

export async function next(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Next", exact: true }).click();
}

/** Reveals every line of the conversation on the current step. */
export async function revealConversation(page: Page): Promise<void> {
  const advance = page.getByRole("button", { name: /^(Start the conversation|Next line)$/ });
  for (let i = 0; i < 15 && (await advance.count()) > 0; i += 1) {
    await advance.click();
  }
  await expect(page.getByRole("button", { name: "Conversation finished" })).toBeDisabled();
}

/**
 * Runs `check` on all 13 steps of the walkthrough. The chapter list only reaches the first step
 * of each chapter, so the rest are reached by jumping to the next chapter (which fills in the
 * decisions before it) and going Back.
 */
export async function visitEveryStep(page: Page, check: (step: string) => Promise<void>): Promise<void> {
  const chapters = page.getByRole("navigation", { name: "Chapters" });
  const visit = async (): Promise<void> => check((await page.locator("h2").first().textContent()) ?? "untitled step");

  await page.goto("/");
  await visit();
  for (const chapter of CHAPTER_NAMES) {
    await chapters.getByRole("button", { name: chapter, exact: true }).click();
    await visit();
  }
  // [chapter to jump to, how many steps before it are not the start of a chapter]
  const laterSteps = [["Price", 1], ["Match", 1], ["Debrief", 2], ["Engine", 1]] as const;
  for (const [chapter, backs] of laterSteps) {
    await chapters.getByRole("button", { name: chapter, exact: true }).click();
    for (let i = 0; i < backs; i += 1) {
      await page.getByRole("button", { name: "Back", exact: true }).click();
      await visit();
    }
  }
}
