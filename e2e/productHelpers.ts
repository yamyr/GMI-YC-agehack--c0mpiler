import AxeBuilder from "@axe-core/playwright";
import { type Page, expect } from "@playwright/test";

/** Signs in to the product with the on-screen stand-in code. */
export async function productSignIn(page: Page, email: string): Promise<void> {
  await page.getByLabel("Your email address").fill(email);
  await page.getByRole("button", { name: "Send me a code" }).click();
  const code = await page.locator(".stand-in__code strong").innerText();
  await page.getByLabel("Six-digit code").fill(code);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("navigation", { name: "Your Agely" })).toBeVisible();
}

/** Constitution principle I on one product page: axe WCAG 2.1 AA, the 16px floor, no overflow. */
export async function productAudit(page: Page, where: string): Promise<void> {
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
