import { type Page, expect, test } from "@playwright/test";
import { ROUTE_NAMES, type RouteName } from "../src/product/routes";
import { buyerMatchedWithRuth, productAudit, productSignIn, productSignOut, seedExperts } from "./productHelpers";

// Spec 004, story 5: everything is labelled, and every page meets the Older Adults First rules.
// One journey reaches every product page; the last assertion fails if a page is ever added to
// the route table without being added here.

test.use({ timezoneId: "America/New_York" });

type Service = "sign-in" | "agent" | "payments" | "meetings";

/** Which stand-ins each page depends on, and so must label inside its own content (FR-022). */
const DEPENDS_ON: Record<RouteName, readonly Service[]> = {
  "sign-in": ["sign-in"],
  home: [],
  account: [],
  "expert-interview": ["agent"],
  "expert-profile": [],
  "expert-price": ["agent"],
  "expert-inbox": ["payments"],
  "expert-earnings": ["payments"],
  "buyer-brief": ["agent"],
  "buyer-brief-new": ["agent"],
  "buyer-match": [],
  "buyer-proposal": ["payments"],
  session: ["payments", "meetings"],
};

const visited = new Set<RouteName>();

async function check(page: Page, route: RouteName): Promise<void> {
  // Every page: the try-out notice, and the list of what is connected with all five stand-ins.
  await expect(page.getByText(/try-out version of Agely/), `try-out notice on ${route}`).toBeVisible();
  const services = page.getByRole("region", { name: "What is connected" });
  for (const label of ["Stand-in sign-in", "Stand-in storage", "Stand-in agent", "Stand-in payments", "Stand-in meeting link"]) {
    await expect(services.getByText(label, { exact: false }), `${label} listed on ${route}`).toBeVisible();
  }
  // The three things this version cannot do are stated, not hidden (R18).
  for (const limit of ["Use one browser tab", "Nothing is sent to the other person", "Anyone can sign in as any address on this device"]) {
    await expect(page.getByText(limit, { exact: false }), `limit stated on ${route}: ${limit}`).toBeVisible();
  }
  // The page's own content labels each stand-in it depends on.
  for (const service of DEPENDS_ON[route]) {
    await expect(page.locator(`.demo-stage [data-stand-in="${service}"]`).first(), `${service} stand-in labelled on ${route}`).toBeVisible();
  }
  if (DEPENDS_ON[route].includes("payments")) {
    await expect(page.locator('.demo-stage [data-stand-in="payments"]').first()).toContainText("no money has moved");
  }

  await productAudit(page, route);

  // Keyboard: every control reached by Tab shows a focus ring.
  for (let i = 0; i < 14; i += 1) {
    await page.keyboard.press("Tab");
    const focused = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (el === null || el === document.body) return null;
      return { label: (el.textContent ?? el.getAttribute("aria-label") ?? el.id).trim().slice(0, 40), outline: getComputedStyle(el).outlineStyle };
    });
    if (focused !== null) expect(focused.outline, `no focus ring on “${focused.label}” (${route})`).not.toBe("none");
  }
  visited.add(route);
}

const open = async (page: Page, hash: string): Promise<void> => {
  await page.goto(`/${hash}`);
  await expect(page.locator(".demo-stage h2").first()).toBeVisible();
};

test("every product page is honest about its stand-ins and meets the Older Adults First rules", async ({ page }) => {
  test.setTimeout(240_000);
  await seedExperts(page);
  await page.goto("/#/app");

  // Signed out. The code step is where the sign-in stand-in shows itself.
  await page.getByLabel("Your email address").fill("sam@example.com");
  await page.getByRole("button", { name: "Send me a code" }).click();
  await check(page, "sign-in");
  await page.goto("/#/app");

  // The buyer's pages.
  await buyerMatchedWithRuth(page, "sam@example.com");
  await check(page, "buyer-match");
  await open(page, "#/app/home");
  await check(page, "home");
  await open(page, "#/app/account");
  await check(page, "account");
  await open(page, "#/app/buyer/brief");
  await check(page, "buyer-brief");
  await open(page, "#/app/buyer/proposal");
  await check(page, "buyer-proposal");
  await page.getByLabel(/^Your name/).fill("Sam Ortiz");
  await page.getByRole("radio").first().check();
  await page.getByRole("button", { name: "Send my proposal" }).click();
  await expect(page.getByText("Waiting for Ruth Adeyemi to answer")).toBeVisible();
  await open(page, "#/app/buyer/brief/new");
  await check(page, "buyer-brief-new");

  // The expert's pages.
  await productSignOut(page);
  await productSignIn(page, "seed-ruth@example.com");
  await open(page, "#/app/expert/interview");
  await check(page, "expert-interview");
  await open(page, "#/app/expert/profile");
  await check(page, "expert-profile");
  await open(page, "#/app/expert/price");
  await check(page, "expert-price");
  await open(page, "#/app/expert/inbox");
  await check(page, "expert-inbox");
  await page.getByRole("button", { name: "Accept" }).click();
  await expect(page.getByRole("heading", { name: "Session confirmed" })).toBeVisible();
  await check(page, "session");
  await open(page, "#/app/expert/earnings");
  await check(page, "expert-earnings");

  expect([...visited].sort(), "every route in src/product/routes.ts is covered by this sweep").toEqual([...ROUTE_NAMES].sort());
});
