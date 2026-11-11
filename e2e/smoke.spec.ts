import { expect, test } from "@playwright/test";
import { collectProblems, installTauriStub } from "./tauriStub";

test("renders the home screen in a plain browser", async ({ page }) => {
  const problems = collectProblems(page);
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByText(/^Web preview v/)).toBeVisible();
  expect(problems).toEqual([]);
});

test("reads native build info through the Tauri bridge", async ({ page }) => {
  const problems = collectProblems(page);
  await installTauriStub(page);
  await page.goto("/");
  await expect(page.getByText("c0mpiler v0.0.0-e2e")).toBeVisible();
  expect(problems).toEqual([]);
});
