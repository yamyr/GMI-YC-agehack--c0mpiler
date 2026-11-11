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
