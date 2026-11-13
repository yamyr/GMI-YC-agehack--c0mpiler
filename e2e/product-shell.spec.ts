import AxeBuilder from "@axe-core/playwright";
import { type Page, expect, test } from "@playwright/test";

// The product shell on stand-ins (spec 004): sign-in with an on-screen code, role choice,
// persistence across a reload, honest labels and the Older Adults First checks.

async function audit(page: Page, where: string): Promise<void> {
  const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`), `accessibility on ${where}`).toEqual([]);
  const tooSmall = await page.evaluate(() =>
    Array.from(document.body.querySelectorAll<HTMLElement>("*"))
      .filter((el) => Array.from(el.childNodes).some((n) => n.nodeType === Node.TEXT_NODE && (n.textContent ?? "").trim() !== "") && el.offsetParent !== null)
      .filter((el) => Number.parseFloat(getComputedStyle(el).fontSize) < 16)
      .map((el) => `${el.tagName}.${el.className}`),
  );
  expect(tooSmall, `text below 16px on ${where}`).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth), `overflow on ${where}`).toBeLessThanOrEqual(0);
}

async function signIn(page: Page, email: string): Promise<void> {
  await page.getByLabel("Your email address").fill(email);
  await page.getByRole("button", { name: "Send me a code" }).click();
  const code = await page.locator(".stand-in__code strong").innerText();
  await page.getByLabel("Six-digit code").fill(code);
  await page.getByRole("button", { name: "Sign in" }).click();
}

test("a person signs in with a stand-in code, chooses a role, and is still signed in after a reload", async ({ page }) => {
  await page.goto("/#/app");
  await expect(page.getByText(/try-out version of Agely/)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Sign in to try Agely" })).toBeVisible();
  await audit(page, "sign-in");

  await page.getByLabel("Your email address").fill("not-an-email");
  await page.getByRole("button", { name: "Send me a code" }).click();
  await expect(page.getByRole("alert")).toContainText("doesn't look like an email address");

  await page.getByLabel("Your email address").fill("Ruth@Example.com");
  await page.getByRole("button", { name: "Send me a code" }).click();
  await expect(page.locator(".stand-in").getByText(/a real version would email this code/)).toBeVisible();
  await audit(page, "code");

  await page.getByLabel("Six-digit code").fill("000000x");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("alert")).toContainText("That code isn't right");

  const code = await page.locator(".stand-in__code strong").innerText();
  expect(code).toMatch(/^\d{6}$/);
  await page.getByLabel("Six-digit code").fill(code);
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page.getByRole("heading", { name: "How do you want to use Agely?" })).toBeVisible();
  await expect(page.getByText("Signed in as ruth@example.com")).toBeVisible();
  await audit(page, "role choice");

  await page.getByRole("button", { name: "Continue as an expert" }).click();
  await expect(page.getByText("acting as an expert")).toBeVisible();

  await page.reload();
  await expect(page.getByText("Signed in as ruth@example.com, acting as an expert.")).toBeVisible();

  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page.getByRole("heading", { name: "Sign in to try Agely" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Sign in to try Agely" })).toBeVisible();
});

test("the same address gets the same account and role back, whatever its case", async ({ page }) => {
  await page.goto("/#/app");
  await signIn(page, "sam@example.com");
  await page.getByRole("button", { name: "Continue as a buyer" }).click();
  await expect(page.getByText("acting as a buyer")).toBeVisible();
  await page.getByRole("button", { name: "Sign out" }).click();

  await signIn(page, "SAM@example.com");
  await expect(page.getByText("Signed in as sam@example.com, acting as a buyer.")).toBeVisible();
});

test("every service says it is a stand-in, on every state of the shell", async ({ page }) => {
  await page.goto("/#/app");
  const services = page.getByRole("region", { name: "What is connected" });
  for (const state of ["signed out", "signed in"]) {
    for (const label of ["Stand-in sign-in", "Stand-in storage", "Stand-in agent", "Stand-in payments: no money has moved", "Stand-in meeting link"]) {
      await expect(services.getByText(label, { exact: false }), `${label} when ${state}`).toBeVisible();
    }
    if (state === "signed out") await signIn(page, "ruth@example.com");
  }
});

test("the walkthrough is still the default and links to the product", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Demo — scripted data")).toBeVisible();
  await page.getByRole("link", { name: "Try the product" }).click();
  await expect(page.getByRole("heading", { name: "Sign in to try Agely" })).toBeVisible();
  await page.getByRole("link", { name: "Back to the walkthrough" }).click();
  await expect(page.getByText("Demo — scripted data")).toBeVisible();
  // The walkthrough stores nothing (FR-023).
  expect(await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith("agely.product")))).toEqual([]);
});
