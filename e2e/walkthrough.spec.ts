import { expect, test } from "@playwright/test";
import { jumpTo, next, revealConversation, start } from "./helpers";

test.describe("US1 — Margaret onboards and prices", () => {
  test("talks, changes her profile by replying, publishes, and names her price", async ({ page }) => {
    await start(page);
    await expect(page.getByText("Now: Margaret, the expert")).toBeVisible();
    await expect(page.getByText("This conversation stands in for a voice interview.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Next", exact: true })).toBeDisabled();
    await revealConversation(page);
    await next(page);

    await expect(page.getByText("Draft — not published")).toBeVisible();
    await expect(page.getByText("From the interview (line 6)")).toBeVisible();
    await expect(page.getByText("From: Supplier audit checklist.pdf")).toBeVisible();
    await expect(page.getByRole("button", { name: "Next", exact: true })).toBeDisabled();

    await page.getByRole("button", { name: /Call the first one/ }).click();
    await expect(page.locator(".competency__label").first()).toHaveText("Contract manufacturing negotiation");
    await expect(page.getByText("Done — I've renamed it.")).toBeVisible();

    await page.getByRole("button", { name: "Publish my profile" }).click();
    await expect(page.getByText("Published", { exact: true })).toBeVisible();
    await expect(page.getByText(/Credentials are self-declared/)).toBeVisible();
    await next(page);

    await expect(page.getByRole("heading", { name: "What should Margaret charge?" })).toBeVisible();
    await expect(page.getByText("$60–$90 per 15 minutes").first()).toBeVisible();
    await page.getByRole("button", { name: /I'd rather charge \$65–\$95/ }).click();
    await expect(page.getByText("$65–$95 per 15 minutes", { exact: true })).toBeVisible();
    await expect(page.getByText("Not confirmed yet")).toBeVisible();
    await page.getByRole("button", { name: "Confirm my price" }).click();
    await expect(page.getByText("Confirmed", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Next", exact: true })).toBeEnabled();
  });

  test("can also type a change as the alternative to talking", async ({ page }) => {
    await start(page);
    await revealConversation(page);
    await next(page);
    await page.getByText("Or type the change yourself").click();
    const field = page.getByLabel("Rename “Supplier negotiation”");
    await field.fill("Negotiating with suppliers");
    await page.locator(".field-row").filter({ has: field }).getByRole("button", { name: "Save name" }).click();
    await expect(page.locator(".competency__label").nth(1)).toHaveText("Negotiating with suppliers");
  });
});

test.describe("US2 — Dev's brief and match", () => {
  test("confirms a brief and sees why Margaret is the match", async ({ page }) => {
    await jumpTo(page, "Dev's brief");
    await expect(page.getByText("Now: Dev, the buyer")).toBeVisible();
    await revealConversation(page);
    await next(page);

    await expect(page.getByText("Draft — check and confirm")).toBeVisible();
    await expect(page.getByLabel("The problem, in one sentence")).toHaveValue(/commercial terms/);
    await expect(page.getByText("30 minutes (2 × 15 min)")).toBeVisible();
    await expect(page.getByText("Budget: $50–$100 per 15 minutes")).toBeVisible();
    await page.getByRole("button", { name: "Confirm my brief" }).click();
    await next(page);

    await expect(page.getByRole("heading", { name: "Agely matched Dev with Margaret Okafor" })).toBeVisible();
    await expect(page.getByText("Price overlap: $60–$90 per 15 minutes")).toBeVisible();
    await expect(page.getByText(/covers what you need: “Contract manufacturing terms”/)).toBeVisible();
    await expect(page.getByRole("heading", { name: "Why not the others" })).toBeVisible();
    await expect(page.getByRole("listitem").filter({ hasText: "Harold Brooks" })).toContainText("Doesn't list");
    await expect(page.getByRole("listitem").filter({ hasText: "Lin Zhao" })).toContainText("$120–$160");
  });
});

test.describe("US3 — book, pay, debrief, engine", () => {
  test("books inside the overlap, releases payment, and grows the engine", async ({ page }) => {
    await jumpTo(page, "Book & pay");
    await expect(page.getByText("Now: Dev, the buyer")).toBeVisible();

    const price = page.getByLabel(/Price per 15 minutes/);
    await price.fill("95");
    await expect(page.getByRole("alert")).toContainText("$95 is outside the range you and Margaret share ($60–$90)");
    await price.fill("75");
    await expect(page.getByText("Total: $150 for 30 minutes")).toBeVisible();
    await page.getByRole("button", { name: "Send proposal to Margaret" }).click();
    await expect(page.getByText("Sent to Margaret. Waiting for her answer.")).toBeVisible();
    await next(page);

    await expect(page.getByText("Now: Margaret, the expert")).toBeVisible();
    await expect(page.getByText("Nothing is booked or charged until Margaret accepts.")).toBeVisible();
    await page.getByRole("button", { name: "Accept", exact: true }).click();
    await next(page);

    await expect(page.getByText("Now: Margaret and Dev")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Session confirmed" })).toBeVisible();
    await expect(page.getByText("Demo link — not a real meeting")).toBeVisible();
    await expect(page.getByText("https://meet.example.com/agely-demo-s1")).toBeVisible();
    await expect(page.getByText("Payment held until the session takes place")).toBeVisible();
    await page.getByRole("button", { name: "Mark the session as held" }).click();
    await expect(page.getByText("Released to Margaret")).toBeVisible();
    await next(page);

    await revealConversation(page);
    await next(page);
    await expect(page.getByText("Proposed", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Next", exact: true })).toBeDisabled();
    await page.getByRole("button", { name: "Approve for my engine" }).click();
    await expect(page.getByText("Approved", { exact: true })).toBeVisible();
    await next(page);

    await expect(page.getByRole("heading", { name: "Margaret's engine" })).toBeVisible();
    const stats = page.locator(".stat-row");
    await expect(stats).toContainText("1workflow");
    await expect(stats).toContainText("1session completed");
    await expect(stats).toContainText("$150earned");
    await expect(page.getByText("First read of a contract-manufacturing agreement")).toBeVisible();
  });
});
