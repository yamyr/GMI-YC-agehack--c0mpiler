import { type Page, expect, test } from "@playwright/test";
import { productAudit, productSignIn, seedExperts, setProfileState } from "./productHelpers";

// Spec 004, story 2: a buyer is matched with real experts.

async function describeProblem(page: Page, problem: string, length = "30 minutes", budget = "$50 to $100"): Promise<void> {
  await page.getByRole("button", { name: problem, exact: true }).click();
  await page.getByRole("button", { name: length, exact: true }).click();
  await page.getByRole("button", { name: budget, exact: true }).click();
}

test.beforeEach(async ({ page }) => {
  await seedExperts(page);
  await page.goto("/#/app");
  await productSignIn(page, "sam@example.com");
  await page.getByRole("button", { name: "Continue as a buyer" }).click();
});

test("a buyer describes a problem, confirms the brief, and sees who fits and why", async ({ page }) => {
  await expect(page.getByRole("heading", { name: "What to do next" })).toBeVisible();
  await productAudit(page, "buyer home");
  await page.getByRole("link", { name: "Describe my problem" }).click();
  await expect(page).toHaveURL(/#\/app\/buyer\/brief$/);
  await expect(page.locator(".stand-in").getByText(/Stand-in agent/)).toBeVisible();
  await productAudit(page, "brief conversation");
  await describeProblem(page, "I'm about to sign with a contract manufacturer for the first time.");

  // The draft brief.
  await expect(page.getByText("Draft: check and confirm")).toBeVisible();
  await expect(page.getByLabel("The problem, in one sentence")).toHaveValue(/contract manufacturer/);
  await expect(page.getByText("Skill needed: Contract manufacturing terms")).toBeVisible();
  await expect(page.getByLabel("Session length")).toHaveValue("2");
  await expect(page.getByLabel("Lowest budget per 15 minutes")).toHaveValue("50");
  await expect(page.getByText(/Agely doesn't give legal, medical or financial advice/)).toBeVisible();
  await productAudit(page, "brief review");

  // Regulated advice is declined.
  await page.getByLabel("The problem, in one sentence").fill("I need legal advice on my manufacturing contract");
  await page.getByRole("button", { name: "Confirm my brief" }).click();
  await expect(page.getByRole("alert")).toContainText("Agely doesn't offer legal advice");
  await page.getByLabel("The problem, in one sentence").fill("Review the commercial terms of my first manufacturing contract");
  await page.getByRole("button", { name: "Confirm my brief" }).click();

  // The match.
  await expect(page).toHaveURL(/#\/app\/buyer\/match$/);
  await expect(page.getByRole("heading", { name: "Agely matched you with Ruth Adeyemi" })).toBeVisible();
  await expect(page.getByText("Price overlap: $60–$90 per 15 minutes")).toBeVisible();
  await expect(page.getByText(/covers what you need/)).toBeVisible();
  await expect(page.getByText(/Credentials are self-declared/)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Why not the others" })).toBeVisible();
  await expect(page.getByRole("listitem").filter({ hasText: "Harold Brooks" })).toContainText("Doesn't list the skill you need");
  await expect(page.getByRole("listitem").filter({ hasText: "Lin Zhao" })).toContainText("$120–$160");
  await productAudit(page, "match");

  // It is still there after a reload, and the brief can be reopened.
  await page.reload();
  await expect(page.getByRole("heading", { name: "Agely matched you with Ruth Adeyemi" })).toBeVisible();
  await page.getByRole("link", { name: "Change my brief" }).click();
  await expect(page.getByText("Confirmed", { exact: true })).toBeVisible();
});

test("when nobody fits, the buyer is told whether the gap is price or skill", async ({ page }) => {
  await page.getByRole("link", { name: "Describe my problem" }).click();
  await describeProblem(page, "I'm about to sign with a contract manufacturer for the first time.");
  await page.getByLabel("Lowest budget per 15 minutes").fill("20");
  await page.getByLabel("Highest budget per 15 minutes").fill("30");
  await page.getByRole("button", { name: "Confirm my brief" }).click();
  await expect(page.getByRole("heading", { name: "No match yet" })).toBeVisible();
  await expect(page.getByText(/charge outside your budget of \$20–\$30/)).toBeVisible();
  await productAudit(page, "no match");

  await page.getByRole("link", { name: "Start a new brief" }).click();
  await describeProblem(page, "I'm hiring my first employee.");
  await page.getByRole("button", { name: "Confirm my brief" }).click();
  await expect(page.getByRole("heading", { name: "No match yet" })).toBeVisible();
  await expect(page.getByText("No published expert lists “Hiring” yet.")).toBeVisible();
});

test("a match whose expert has unpublished is shown as unavailable and can be run again", async ({ page }) => {
  await page.getByRole("link", { name: "Describe my problem" }).click();
  await describeProblem(page, "I'm about to sign with a contract manufacturer for the first time.");
  await page.getByRole("button", { name: "Confirm my brief" }).click();
  await expect(page.getByRole("heading", { name: "Agely matched you with Ruth Adeyemi" })).toBeVisible();

  await setProfileState(page, "seed-ruth", "draft");
  await page.reload();
  await expect(page.getByRole("alert")).toContainText("This match is no longer available");
  await page.getByRole("button", { name: "Match again" }).click();
  await expect(page.getByRole("heading", { name: "No match yet" })).toBeVisible();
  // An unpublished expert is not named among the others.
  await expect(page.getByText("Ruth Adeyemi")).toHaveCount(0);
});
