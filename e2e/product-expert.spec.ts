import { type Page, expect, test } from "@playwright/test";
import { productAudit, productSignIn, seedExperts } from "./productHelpers";

// Spec 004, story 1: an expert's profile is kept.

async function answer(page: Page, text: string): Promise<void> {
  await page.getByRole("button", { name: text, exact: true }).click();
}

async function interview(page: Page, name: string): Promise<void> {
  await page.getByRole("link", { name: "Start the interview" }).click();
  await expect(page.getByText("What should people call you?")).toBeVisible();
  await page.getByLabel("Your name").fill(name);
  await page.getByRole("button", { name: "That's my name" }).click();
  await answer(page, "I was a hospital pharmacist for 38 years.");
  await answer(page, "Staff scheduling and dealing with vendors.");
  await answer(page, "I passed a hard audit after fixing our process.");
  await answer(page, "Leeds, England");
}

test("an expert is interviewed, edits and publishes a profile, sets a price, and finds it all there later", async ({ page }) => {
  // A whole journey with an accessibility audit at every step: allow three times the usual time.
  test.slow();
  await page.goto("/#/app");
  await productSignIn(page, "ruth@example.com");
  await page.getByRole("button", { name: "Continue as an expert" }).click();

  await expect(page.getByRole("heading", { name: "What to do next" })).toBeVisible();
  await productAudit(page, "expert home");

  await page.getByRole("link", { name: "Start the interview" }).click();
  await expect(page).toHaveURL(/#\/app\/expert\/interview$/);
  await expect(page.locator(".stand-in").getByText(/Stand-in agent/)).toBeVisible();
  await productAudit(page, "interview: name");
  await page.getByLabel("Your name").fill("Ruth Adeyemi");
  await page.getByRole("button", { name: "That's my name" }).click();

  await expect(page.getByText("What work did you do, and for how long?", { exact: false })).toBeVisible();
  await productAudit(page, "interview: question");
  await answer(page, "I was a hospital pharmacist for 38 years.");
  await answer(page, "Staff scheduling and dealing with vendors.");
  // The alternative to picking a reply is typing one.
  await page.getByText("Or type your answer").click();
  await page.getByLabel("Your answer").fill("I passed a hard audit after fixing our process.");
  await page.getByRole("button", { name: "Send my answer" }).click();
  await answer(page, "Leeds, England");

  // The draft profile.
  await expect(page).toHaveURL(/#\/app\/expert\/profile$/);
  await expect(page.getByRole("heading", { name: "Ruth Adeyemi" })).toBeVisible();
  await expect(page.getByText("Draft: not published")).toBeVisible();
  await expect(page.getByText("38 years of experience")).toBeVisible();
  await expect(page.getByText("Leeds, England")).toBeVisible();
  await expect(page.locator(".competency")).toHaveCount(4);
  await expect(page.getByText("From your interview (answer 1)")).toBeVisible();
  await expect(page.getByText(/Credentials are self-declared/)).toBeVisible();
  await productAudit(page, "profile draft");

  // Edit one skill, remove another.
  const second = page.locator(".competency").nth(1);
  await second.getByText("Change the wording").click();
  await second.getByLabel(/^New wording for/).fill("Rota planning for pharmacy teams");
  await second.getByRole("button", { name: "Save wording" }).click();
  await expect(page.locator(".competency__label").nth(1)).toHaveText("Rota planning for pharmacy teams");
  await expect(page.locator(".competency").nth(1).getByText("Edited by you")).toBeVisible();
  await page.locator(".competency").nth(3).getByRole("button", { name: /^Remove/ }).click();
  await expect(page.locator(".competency")).toHaveCount(3);

  await page.getByRole("button", { name: "Publish my profile" }).click();
  await expect(page.getByText("Published", { exact: true })).toBeVisible();

  // Price.
  await page.getByRole("link", { name: "Set my price" }).click();
  await expect(page).toHaveURL(/#\/app\/expert\/price$/);
  await expect(page.getByText("Not confirmed yet")).toBeVisible();
  await expect(page.locator(".stand-in").getByText(/Stand-in agent/)).toBeVisible();
  await productAudit(page, "price");
  await page.getByLabel("Lowest price per 15 minutes").fill("90");
  await page.getByLabel("Highest price per 15 minutes").fill("60");
  await page.getByRole("button", { name: "Confirm my price" }).click();
  await expect(page.getByRole("alert")).toContainText("lowest price");
  await page.getByLabel("Lowest price per 15 minutes").fill("60");
  await page.getByLabel("Highest price per 15 minutes").fill("90");
  await page.getByRole("button", { name: "Confirm my price" }).click();
  await expect(page.getByText("Confirmed: $60–$90 per 15 minutes")).toBeVisible();

  // Close and come back: reload, sign out, sign in again.
  await page.reload();
  await expect(page.getByText("Confirmed: $60–$90 per 15 minutes")).toBeVisible();
  await page.getByRole("button", { name: "Sign out" }).click();
  await productSignIn(page, "ruth@example.com");
  await expect(page.getByText("Your profile is published and buyers can be matched with you.")).toBeVisible();
  await page.getByRole("link", { name: "See my profile" }).click();
  await expect(page.getByText("Published", { exact: true })).toBeVisible();
  await expect(page.locator(".competency")).toHaveCount(3);
  await expect(page.locator(".competency__label").nth(1)).toHaveText("Rota planning for pharmacy teams");

  // Unpublish for a holiday, then publish again; nothing else changes.
  await page.getByRole("button", { name: "Unpublish my profile" }).click();
  await expect(page.getByText("Draft: not published")).toBeVisible();
  await expect(page.locator(".competency")).toHaveCount(3);
  await page.getByRole("button", { name: "Publish my profile" }).click();
  await expect(page.getByText("Published", { exact: true })).toBeVisible();
});

test("an interview that names no skill asks for more instead of inventing one", async ({ page }) => {
  await page.goto("/#/app");
  await productSignIn(page, "gardener@example.com");
  await page.getByRole("button", { name: "Continue as an expert" }).click();
  await page.getByRole("link", { name: "Start the interview" }).click();
  await page.getByLabel("Your name").fill("Pat");
  await page.getByRole("button", { name: "That's my name" }).click();
  for (let i = 0; i < 4; i += 1) {
    await page.getByText("Or type your answer").click();
    await page.getByLabel("Your answer").fill("I like gardening.");
    await page.getByRole("button", { name: "Send my answer" }).click();
  }
  await expect(page.getByRole("alert")).toContainText("couldn't find a skill");
  await expect(page).toHaveURL(/#\/app\/expert\/interview$/);
  await expect(page.getByText("What work did you do, and for how long?", { exact: false })).toBeVisible();
});

test("an expert can confirm a price entered with Devanagari and Tamil decimal digits", async ({ page }) => {
  await page.goto("/?lang=en#/app");
  await productSignIn(page, "ruth@example.com");
  await page.getByRole("button", { name: "Continue as an expert" }).click();
  await interview(page, "Ruth Adeyemi");
  await page.getByRole("link", { name: "Set my price" }).click();

  await page.getByLabel("Lowest price per 15 minutes").fill("६०");
  await page.getByLabel("Highest price per 15 minutes").fill("௯௦");
  await page.getByRole("button", { name: "Confirm my price" }).click();

  await expect(page.getByText("Confirmed: $60–$90 per 15 minutes")).toBeVisible();
});

test("an untouched skill field follows the language while a typed edit is kept", async ({ page }) => {
  await seedExperts(page);
  await page.goto("/?lang=en#/app");
  await productSignIn(page, "seed-ruth@example.com");
  await page.goto("/?lang=en#/app/expert/profile");
  const skill = page.locator(".competency").first();
  await skill.locator("summary").click();
  const label = skill.locator(".competency__label");
  const field = skill.locator("input");
  await expect(field).toHaveValue("Contract manufacturing terms");

  await page.locator("#language").selectOption("fr");
  await expect(label).toHaveText("Conditions de fabrication en sous-traitance");
  await expect(field).toHaveValue("Conditions de fabrication en sous-traitance");

  await field.fill("My contract wording");
  await page.locator("#language").selectOption("en");
  await expect(field).toHaveValue("My contract wording");
});

test("one expert cannot see another's profile, and a deleted account is gone", async ({ page }) => {
  await page.goto("/#/app");
  await productSignIn(page, "ruth@example.com");
  await page.getByRole("button", { name: "Continue as an expert" }).click();
  await interview(page, "Ruth Adeyemi");
  await page.getByRole("button", { name: "Publish my profile" }).click();
  await page.getByRole("button", { name: "Sign out" }).click();

  // A second expert on the same device starts with nothing.
  await productSignIn(page, "walter@example.com");
  await page.getByRole("button", { name: "Continue as an expert" }).click();
  await expect(page.getByRole("link", { name: "Start the interview" })).toBeVisible();
  await page.goto("/#/app/expert/profile");
  await expect(page.getByText("You don't have a profile yet.")).toBeVisible();
  await expect(page.getByText("Ruth Adeyemi")).toHaveCount(0);
  await page.getByRole("button", { name: "Sign out" }).click();

  // Ruth deletes her account, in two deliberate steps.
  await productSignIn(page, "ruth@example.com");
  await page.getByRole("navigation", { name: "Your Agely" }).getByRole("link", { name: "Account" }).click();
  await page.getByRole("button", { name: "Delete my account" }).click();
  await expect(page.getByText(/This removes your account, your profile/)).toBeVisible();
  await productAudit(page, "delete confirmation");
  await page.getByRole("button", { name: "Yes, delete everything" }).click();
  await expect(page.getByRole("heading", { name: "Sign in to try Agely" })).toBeVisible();

  await productSignIn(page, "ruth@example.com");
  await expect(page.getByRole("heading", { name: "How do you want to use Agely?" })).toBeVisible();
});
