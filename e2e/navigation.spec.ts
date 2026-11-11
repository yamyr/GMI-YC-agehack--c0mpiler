import { expect, test } from "@playwright/test";
import { jumpTo, next } from "./helpers";

test("jumps between chapters and restarts in one action (SC-002)", async ({ page }) => {
  await jumpTo(page, "Match");
  await expect(page.getByText("Step 7 of 13 · Match")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Agely matched Dev with Margaret Okafor" })).toBeVisible();

  await page.getByRole("navigation", { name: "Chapters" }).getByRole("button", { name: "Engine" }).click();
  await expect(page.getByRole("heading", { name: "Margaret's engine" })).toBeVisible();
  await expect(page.locator(".stat-row")).toContainText("$150earned");
  await expect(page.getByRole("button", { name: "Next", exact: true })).toHaveCount(0);

  await page.getByRole("button", { name: "Restart" }).click();
  await expect(page.getByRole("heading", { name: "Experience shouldn't retire." })).toBeVisible();
  await expect(page.getByText("Step 1 of 13")).toBeVisible();
});

test("going back keeps earlier decisions", async ({ page }) => {
  await jumpTo(page, "Price");
  await page.getByRole("button", { name: "Back" }).click();
  await expect(page.getByText("Published", { exact: true })).toBeVisible();
  await next(page);
  await expect(page.getByRole("heading", { name: "What should Margaret charge?" })).toBeVisible();
});

test("moves focus to each new step's heading", async ({ page }) => {
  await jumpTo(page, "Match");
  await next(page);
  await expect(page.getByRole("heading", { name: "Dev proposes a session to Margaret" })).toBeFocused();
});
