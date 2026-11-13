import { readFileSync } from "node:fs";
import { type Page, expect, test } from "@playwright/test";
import { buyerMatchedWithRuth, paymentCount, productAudit, productSignIn, productSignOut, seedExperts } from "./productHelpers";

// Spec 004, story 3: a session is booked and the payment is held.

// Times are shown in the viewer's own time zone; pin it so the test reads the same everywhere.
test.use({ timezoneId: "America/New_York" });

async function propose(page: Page): Promise<void> {
  await page.getByRole("link", { name: "Propose a session" }).click();
  await expect(page).toHaveURL(/#\/app\/buyer\/proposal$/);
  await page.getByLabel(/^Your name/).fill("Sam Ortiz");
  await page.getByRole("radio").first().check();
  await page.getByRole("button", { name: "Send my proposal" }).click();
  await expect(page.getByText("Waiting for Ruth Adeyemi to answer")).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await seedExperts(page);
  await page.goto("/#/app");
  await buyerMatchedWithRuth(page, "sam@example.com");
});

test("a buyer proposes, the expert accepts, and both see a confirmed session with a held payment and a link", async ({ page }) => {
  test.slow();
  await page.getByRole("link", { name: "Propose a session" }).click();
  await expect(page.getByText("You and Ruth Adeyemi share a price range of $60–$90 per 15 minutes.")).toBeVisible();
  await expect(page.getByText("Nothing is booked or charged until Ruth Adeyemi accepts.")).toBeVisible();
  await productAudit(page, "proposal form");

  // A price outside the shared range is refused with the reason.
  await page.getByLabel(/^Your name/).fill("Sam Ortiz");
  await page.getByRole("radio").first().check();
  await page.getByLabel("Price per 15 minutes").fill("95");
  await page.getByRole("button", { name: "Send my proposal" }).click();
  await expect(page.getByRole("alert")).toContainText("$95 is outside the range you and Ruth Adeyemi share ($60–$90)");
  await page.getByLabel("Price per 15 minutes").fill("75");
  await expect(page.getByText("30 minutes at $75 per 15 minutes comes to $150.")).toBeVisible();
  await page.getByRole("button", { name: "Send my proposal" }).click();

  await expect(page.getByText("Waiting for Ruth Adeyemi to answer")).toBeVisible();
  await expect(page.getByText(/at 10:00 AM E[SD]T/)).toBeVisible();
  await productAudit(page, "proposal waiting");
  expect(await paymentCount(page)).toBe(0);

  // The expert answers from her own account.
  await productSignOut(page);
  await productSignIn(page, "seed-ruth@example.com");
  await expect(page.getByText("You have 1 proposal waiting for your answer.")).toBeVisible();
  await page.getByRole("link", { name: "Open my inbox" }).click();
  await expect(page).toHaveURL(/#\/app\/expert\/inbox$/);
  const card = page.locator(".card").filter({ hasText: "Sam Ortiz" });
  await expect(card).toContainText("30 minutes at $75 per 15 minutes, $150 in total");
  await expect(card).toContainText("contract manufacturer");
  await expect(page.getByText("Nothing is booked or charged until you accept.")).toBeVisible();
  await productAudit(page, "inbox");
  await card.getByRole("button", { name: "Accept" }).click();

  // The confirmed session, as the expert sees it.
  await expect(page).toHaveURL(/#\/app\/session\/.+/);
  const sessionUrl = page.url();
  await expect(page.getByRole("heading", { name: "Session confirmed" })).toBeVisible();
  await expect(page.getByText("With Sam Ortiz")).toBeVisible();
  await expect(page.getByText(/at 10:00 AM E[SD]T/)).toBeVisible();
  await expect(page.getByText("$150 is held until the session has taken place.")).toBeVisible();
  await expect(page.locator('.demo-stage [data-stand-in="payments"]')).toContainText("no money has moved");
  await expect(page.locator('.demo-stage [data-stand-in="meetings"]')).toContainText("not a real meeting");
  await expect(page.getByRole("link", { name: "Open the meeting link" })).toHaveAttribute("href", /^https:\/\/meet\.agely\.example\//);
  await productAudit(page, "session");
  expect(await paymentCount(page)).toBe(1);

  // The calendar file is real even though the meeting link is a stand-in.
  const downloading = page.waitForEvent("download");
  await page.getByRole("link", { name: "Add to my calendar" }).click();
  const download = await downloading;
  expect(download.suggestedFilename()).toBe("agely-session.ics");
  const ics = readFileSync(await download.path(), "utf8");
  expect(ics).toContain("BEGIN:VEVENT");
  expect(ics).toContain("SUMMARY:Agely session: Sam Ortiz and Ruth Adeyemi");
  expect(ics).toMatch(/DTSTART:\d{8}T1[45]0000Z/); // 10:00 in New York is 14:00 or 15:00 UTC

  // The buyer sees the same session.
  await productSignOut(page);
  await productSignIn(page, "sam@example.com");
  await page.getByRole("link", { name: /^Session with Ruth Adeyemi/ }).click();
  await expect(page.getByRole("heading", { name: "Session confirmed" })).toBeVisible();
  await expect(page.getByText("With Ruth Adeyemi")).toBeVisible();
  await expect(page.getByText("$150 is held until the session has taken place.")).toBeVisible();

  // Someone else cannot open it by its address.
  await productSignOut(page);
  await productSignIn(page, "walter@example.com");
  await page.goto(sessionUrl);
  await expect(page.getByText("This session isn't yours, or it doesn't exist.")).toBeVisible();
  await expect(page.getByText("Sam Ortiz")).toHaveCount(0);
});

test("when the expert declines, nothing is held and the buyer can propose again", async ({ page }) => {
  await propose(page);
  await productSignOut(page);
  await productSignIn(page, "seed-ruth@example.com");
  await page.getByRole("link", { name: "Open my inbox" }).click();
  await page.locator(".card").filter({ hasText: "Sam Ortiz" }).getByRole("button", { name: "Decline" }).click();
  await expect(page.getByText("You have no proposals waiting.")).toBeVisible();
  expect(await paymentCount(page)).toBe(0);

  await productSignOut(page);
  await productSignIn(page, "sam@example.com");
  await page.getByRole("link", { name: "See my proposal" }).click();
  await expect(page.getByRole("alert")).toContainText("Ruth Adeyemi declined your proposal");
  await expect(page.getByRole("button", { name: "Send my proposal" })).toBeVisible();
});

test("a buyer can withdraw a proposal that has not been answered", async ({ page }) => {
  await propose(page);
  await page.getByRole("button", { name: "Withdraw my proposal" }).click();
  await expect(page.getByRole("button", { name: "Send my proposal" })).toBeVisible();
  await productSignOut(page);
  await productSignIn(page, "seed-ruth@example.com");
  await expect(page.getByText(/proposals? waiting for your answer/)).toHaveCount(0);
});
