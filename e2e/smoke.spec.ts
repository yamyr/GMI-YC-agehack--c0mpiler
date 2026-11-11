import { expect, test } from "@playwright/test";
import { collectProblems, installTauriStub } from "./tauriStub";

test("opens on the demo start screen in a plain browser", async ({ page }) => {
  const problems = collectProblems(page);
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: "Agely" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "Experience shouldn't retire." })).toBeVisible();
  await expect(page.getByText("All data is scripted. No agents, payments or calendars are connected.", { exact: false })).toBeVisible();
  await expect(page.getByText("Demo — scripted data")).toBeVisible();
  await expect(page.getByText(/^Web preview v/)).toBeVisible();
  expect(problems).toEqual([]);
});

test("reads native build info through the Tauri bridge", async ({ page }) => {
  const problems = collectProblems(page);
  await installTauriStub(page);
  await page.goto("/");
  await expect(page.getByText("Agely v0.0.0-e2e")).toBeVisible();
  expect(problems).toEqual([]);
});
