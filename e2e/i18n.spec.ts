import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { createTranslator, formatMoney, type Locale } from "../site/i18n/core.js";
import { installTauriStub, READY } from "./tauriStub";

declare global {
  interface Window {
    __localizedTurns: Array<{ readonly args: unknown; readonly resolve: (value: unknown) => void }>;
  }
}

const locales: readonly Locale[] = ["en", "fr", "es", "de", "it", "zh-Hans", "ko", "ja", "da", "uk", "pl", "ro", "nb", "fi", "id", "tl", "ta", "hi"];

test("language choice persists and translated content is presented honestly", async ({ page }) => {
  await page.goto("/?lang=en");
  await page.getByLabel("Language", { exact: true }).selectOption("fr");
  await page.getByRole("button", { name: "Restart in this language" }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "fr");
  await expect(page.locator("h2")).not.toHaveText("Experience shouldn't retire.");
  await expect(page.locator(".translation-notice")).toBeVisible();
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("lang", "fr");
  await expect(page.locator("select[name=language]")).toHaveValue("fr");
});

test("cancelling a language change preserves edits; confirming restarts", async ({ page }) => {
  await page.goto("/?lang=en");
  await page.getByRole("button", { name: "Match", exact: true }).click();
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await page.getByLabel("The problem, in one sentence").fill("My own supplier question");
  await page.getByLabel("Language", { exact: true }).selectOption("de");
  await page.getByRole("button", { name: "Keep current language" }).click();
  await expect(page.getByLabel("The problem, in one sentence")).toHaveValue("My own supplier question");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await page.getByLabel("Language", { exact: true }).selectOption("de");
  await page.getByRole("button", { name: "Restart in this language" }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "de");
  await expect(page.locator("textarea")).toHaveCount(0);
});

test("selecting the active language cancels a pending language change", async ({ page }) => {
  await page.goto("/?lang=en");
  await page.getByLabel("Language", { exact: true }).selectOption("fr");
  await expect(page.getByRole("region", { name: "Change language" })).toBeVisible();
  await page.getByLabel("Language", { exact: true }).selectOption("en");
  await expect(page.getByLabel("Language", { exact: true })).toHaveValue("en");
  await expect(page.getByRole("region", { name: "Change language" })).toHaveCount(0);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
});

test("live requests carry the language and an old reply cannot cross a confirmed restart", async ({ page }) => {
  await installTauriStub(page, { agent_status: READY });
  await page.goto("/?lang=en");
  await expect(page.getByRole("heading", { name: "Live agent: ready", exact: true })).toBeVisible();
  await page.evaluate(() => {
    const original = window.__TAURI_INTERNALS__;
    window.__localizedTurns = [];
    window.__TAURI_INTERNALS__ = {
      ...original,
      invoke: (cmd: string, args?: unknown) => cmd !== "agent_turn" ? original.invoke(cmd) : new Promise((resolve) => {
        window.__localizedTurns.push({ args, resolve });
      }),
    };
  });
  await page.getByRole("button", { name: "Start the walkthrough", exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.__localizedTurns.length)).toBe(1);
  await page.getByLabel("Language", { exact: true }).selectOption("fr");
  await page.getByRole("button", { name: "Restart in this language", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "fr");
  await page.locator(".demo-stage button.primary").click();
  await expect.poll(() => page.evaluate(() => window.__localizedTurns.length)).toBe(2);
  expect(await page.evaluate(() => window.__localizedTurns.map(({ args }) => args))).toMatchObject([
    { request: { brief: { locale: "en" } } }, { request: { brief: { locale: "fr" } } },
  ]);
  await page.evaluate(async () => {
    window.__localizedTurns[0]?.resolve({ message: "Old English reply.", options: ["A", "B", "C"], done: false });
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  });
  await expect(page.locator(".turn--agent")).toHaveCount(0);
  await page.evaluate(() => window.__localizedTurns[1]?.resolve({ message: "Bonjour Margaret.", options: ["Oui", "Non", "Autre"], done: false }));
  await expect(page.locator(".turn--agent")).toContainText("Bonjour Margaret.");
});

test("invalid preferences and inaccessible storage do not prevent startup", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "localStorage", { get() { throw new DOMException("blocked", "SecurityError"); } });
  });
  await page.goto("/?lang=not-a-language");
  await expect(page.locator("h2")).toHaveText("Experience shouldn't retire.");
  await expect(page.getByLabel("Language", { exact: true })).toHaveValue("en");
});

for (const locale of locales) {
  test(`${locale} offers all chapters and retains its language after reload`, async ({ page }) => {
    await page.goto(`/?lang=${locale}`);
    const t = createTranslator(locale);
    await expect(page.locator("html")).toHaveAttribute("lang", locale);
    await expect(page.locator("h2")).toHaveText(t("Experience shouldn't retire."));
    const chapters = page.locator("nav .chapter-list button");
    await expect(chapters).toHaveCount(7);
    await expect(chapters).toHaveText(["Margaret onboards", "Price", "Dev's brief", "Match", "Book & pay", "Debrief", "Engine"].map((source) => t(source)));
    for (let index = 0; index < 7; index += 1) {
      await chapters.nth(index).click();
      await expect(page.locator("h2")).not.toBeEmpty();
      await expect(page.locator(".demo-label")).not.toBeEmpty();
    }
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("lang", locale);
  });
}

// Chapter starts plus the five intervening steps cover all 13 distinct screens.
const localizedSteps = [
  { chapter: null, backs: 0 },
  ...Array.from({ length: 7 }, (_, chapter) => ({ chapter, backs: 0 })),
  { chapter: 1, backs: 1 }, { chapter: 3, backs: 1 },
  { chapter: 5, backs: 1 }, { chapter: 5, backs: 2 }, { chapter: 6, backs: 1 },
];
for (const locale of ["de", "fi", "zh-Hans", "uk", "ta", "hi"]) {
  for (const [step, destination] of localizedSteps.entries()) {
    test(`${locale} screen ${step + 1} keeps accessible names, readable text and fits the window`, async ({ page }) => {
      await page.goto(`/?lang=${locale}`);
      if (destination.chapter !== null) await page.locator("nav .chapter-list button").nth(destination.chapter).click();
      for (let back = 0; back < destination.backs; back += 1) await page.locator(".demo-nav > button").first().click();
      await expect(page.locator("h2")).not.toBeEmpty();
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(0);
      expect(await page.evaluate(() => Array.from(document.querySelectorAll<HTMLElement>("body *")).filter((el) => el.offsetParent !== null && Array.from(el.childNodes).some((node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim()) && Number.parseFloat(getComputedStyle(el).fontSize) < 16).length)).toBe(0);
      const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
      expect(violations.map((violation) => violation.id)).toEqual([]);
    });
  }
}

for (const [locale, minimum, maximum] of [["ta", "௬௫", "௯௫"], ["hi", "६५", "९५"]] satisfies readonly (readonly [Locale, string, string])[]) {
  test(`${locale} accepts native decimal digits as whole USD amounts`, async ({ page }) => {
    const t = createTranslator(locale);
    await page.goto(`/?lang=${locale}`);
    await page.locator(".chapter-list button").nth(1).click();
    await page.locator("details.typed summary").click();
    await page.locator("#price-min").fill(minimum);
    await page.locator("#price-max").fill(maximum);
    await page.getByRole("button", { name: t("Use this range"), exact: true }).click();
    const confirmedPrice = page.locator(".demo-stage .card").last();
    await expect(confirmedPrice).toContainText(formatMoney(65, locale));
    await expect(confirmedPrice).toContainText(formatMoney(95, locale));
    await page.getByRole("button", { name: t("Confirm my price"), exact: true }).click();
    await expect(confirmedPrice).toContainText(t("Confirmed"));
  });
}

test("a French walkthrough keeps every human decision separate through first earnings", async ({ page }) => {
  await page.goto("/?lang=fr");
  const stagePrimary = page.locator(".demo-stage button.primary");
  const next = page.locator(".demo-nav button.primary");
  const reveal = async () => {
    for (let turn = 0; turn < 12 && await stagePrimary.count() > 0; turn += 1) await stagePrimary.click();
    await expect(next).toBeEnabled();
  };
  await stagePrimary.click(); // Start, then the fictional voice interview.
  await reveal();
  await next.click();
  await expect(next).toBeDisabled();
  await stagePrimary.click(); // Publish profile explicitly.
  await next.click();
  await expect(next).toBeDisabled();
  await stagePrimary.click(); // Confirm price explicitly.
  await next.click();
  await reveal();
  await next.click();
  await expect(next).toBeDisabled();
  await stagePrimary.click(); // Confirm the buyer's brief.
  await next.click();
  await next.click(); // Match explanation, then proposal.
  await expect(next).toBeDisabled();
  await stagePrimary.click(); // Send proposal.
  await next.click();
  await expect(next).toBeDisabled();
  await stagePrimary.click(); // Accept separately from sending.
  await next.click();
  await stagePrimary.click(); // Mark fictional session held.
  await next.click();
  await reveal();
  await next.click();
  await expect(next).toBeDisabled();
  await stagePrimary.click(); // Approve proposed workflow.
  await next.click();
  await expect(page.locator(".stat__value").nth(0)).toHaveText("1");
  await expect(page.locator(".stat__value").nth(1)).toHaveText("1");
  await expect(page.locator(".stat__value").nth(2)).toContainText("150");
  await expect(page.locator("html")).toHaveAttribute("lang", "fr");
});
