import { expect, test } from "@playwright/test";
import { jumpTo, next, revealConversation } from "./helpers";

test("explains a price range whose minimum is above its maximum", async ({ page }) => {
  await jumpTo(page, "Price");
  await page.getByText("Or type your own range").click();
  await page.getByLabel("Lowest price per 15 minutes ($)").fill("95");
  await page.getByLabel("Highest price per 15 minutes ($)").fill("65");
  await page.getByRole("button", { name: "Use this range" }).click();
  await expect(page.getByRole("alert")).toContainText("The lowest price ($95) is higher than the highest ($65)");
  // Margaret's current price is unchanged by the rejected range.
  await expect(page.locator("strong", { hasText: "$60–$90 per 15 minutes" })).toBeVisible();
});

test("refuses a brief that asks for legal advice", async ({ page }) => {
  await jumpTo(page, "Dev's brief");
  await revealConversation(page);
  await next(page);
  await page.getByLabel("The problem, in one sentence").fill("I need legal advice about suing my supplier.");
  await page.getByRole("button", { name: "Confirm my brief" }).click();
  await expect(page.getByRole("alert")).toContainText("Agely doesn't offer legal advice");
  await expect(page.getByRole("button", { name: "Next", exact: true })).toBeDisabled();
});

test("Margaret declines: nothing is booked and Dev can propose again", async ({ page }) => {
  await jumpTo(page, "Book & pay");
  await page.getByRole("button", { name: "Send proposal to Margaret" }).click();
  await next(page);
  await page.getByRole("button", { name: "Decline" }).click();
  await expect(page.getByText("Now: Dev, the buyer")).toBeVisible();
  await expect(page.getByText("Margaret declined this time. Nothing was booked or charged.", { exact: false })).toBeVisible();
  await expect(page.getByRole("button", { name: "Send proposal to Margaret" })).toBeEnabled();
});

test("shows an honest no-match when Margaret drops the needed skill", async ({ page }) => {
  await jumpTo(page, "Price");
  await page.getByRole("button", { name: "Back" }).click();
  await page.getByText("Or type the change yourself").click();
  const field = page.getByLabel("Rename “Contract manufacturing terms”");
  await page.locator(".field-row").filter({ has: field }).getByRole("button", { name: "Remove" }).click();
  await expect(page.getByText("Your profile is back to draft.", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Publish my profile" }).click();
  await next(page);
  await page.getByRole("button", { name: "Confirm my price" }).click();
  await next(page);
  await revealConversation(page);
  await next(page);
  await page.getByRole("button", { name: "Confirm my brief" }).click();
  await next(page);
  await expect(page.getByRole("heading", { name: "No match yet" })).toBeVisible();
  await expect(page.getByText(/charge outside your budget of \$50–\$100/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Next", exact: true })).toBeDisabled();
});
