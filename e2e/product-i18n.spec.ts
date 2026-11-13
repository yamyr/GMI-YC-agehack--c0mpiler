import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { createTranslator, formatMoney, LOCALES, type Locale } from "../site/i18n/core.js";
import { paymentCount, productAudit, productSignIn, productSignOut, seedExperts } from "./productHelpers";
import { installTauriStub } from "./tauriStub";

test("changing marketplace language preserves an in-progress sign-in", async ({ page }) => {
  await page.goto("/?lang=en#/app");
  await page.getByLabel("Your email address").fill("ruth@example.com");
  await page.getByRole("button", { name: "Send me a code" }).click();
  const code = page.locator(".stand-in__code strong");
  const original = await code.innerText();
  await page.getByRole("combobox").selectOption("fr");
  await expect(page.locator("html")).toHaveAttribute("lang", "fr");
  await expect(page).toHaveURL(/\?lang=fr#\/app$/);
  await expect(code).toHaveText(original);
  await expect(page.getByRole("heading", { name: "Saisissez votre code" })).toBeVisible();
  await page.getByLabel(createTranslator("fr")("Six-digit code")).fill(original);
  await page.getByRole("button", { name: createTranslator("fr")("Sign in"), exact: true }).click();
  await expect(page.getByText("ruth@example.com", { exact: false })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("navigation", { name: createTranslator("fr")("Your Agely") })).toBeVisible();
  await expect(page.locator(".language-confirmation")).toHaveCount(0);
});

test("every advertised language can open the localized marketplace", async ({ page }) => {
  const english = "Sign in to try Agely";
  for (const { id } of LOCALES) {
    const heading = createTranslator(id)(english);
    if (id !== "en") expect(heading, id).not.toBe(english);
    await page.goto(`/?lang=${id}#/app`);
    await expect(page.locator("html")).toHaveAttribute("lang", id);
    await expect(page.getByRole("heading", { name: heading, exact: true })).toBeVisible();
    await expect(page.locator("select[name=language]")).toHaveValue(id);
  }
});

test("a direct marketplace address in Tauri opens the walkthrough", async ({ page }) => {
  await installTauriStub(page);
  await page.goto("/?lang=en#/app");
  await expect(page.getByRole("heading", { name: "Experience shouldn't retire." })).toBeVisible();
  await expect(page.getByRole("link", { name: "Try the product" })).toHaveCount(0);
});

for (const locale of ["fr", "ta"] as const satisfies readonly Locale[]) {
  test(`${locale} suggestions draft a matching brief and keep authored text across languages`, async ({ page }) => {
    await seedExperts(page);
    await page.goto("/?lang=en#/app");
    await productSignIn(page, "sam@example.com");
    await page.getByRole("button", { name: "Continue as a buyer" }).click();
    await page.getByRole("combobox", { name: "Language" }).selectOption(locale);
    const t = createTranslator(locale);
    await expect(page.locator("html")).toHaveAttribute("lang", locale);
    await page.getByRole("link", { name: t("Describe my problem") }).click();
    const suggestedProblem = "I'm about to sign with a contract manufacturer for the first time.";
    expect(t(suggestedProblem)).not.toBe(suggestedProblem);
    expect(t("$50 to $100")).not.toBe("$50 to $100");
    for (const source of [suggestedProblem, "30 minutes", "$50 to $100"]) {
      await page.getByRole("button", { name: t(source), exact: true }).click();
    }
    const problem = page.getByRole("textbox", { name: t("The problem, in one sentence") });
    await expect(problem).toHaveValue(t(suggestedProblem));
    await expect(page.locator("#brief-units")).toHaveValue("2");
    await expect(page.locator("#brief-min")).toHaveValue("50");
    await expect(page.locator("#brief-max")).toHaveValue("100");
    const typedProblem = "Check the manufacturer's minimum order with Ruth.";
    await problem.fill(typedProblem);
    await page.getByRole("combobox", { name: t("Language") }).selectOption("en");
    await expect(page.getByRole("textbox", { name: "The problem, in one sentence" })).toHaveValue(typedProblem);
    await page.getByRole("button", { name: "Confirm my brief" }).click();
    await expect(page.getByRole("heading", { name: "Agely matched you with Ruth Adeyemi" })).toBeVisible();
    await page.getByRole("combobox", { name: "Language" }).selectOption(locale);
    await expect(page.getByRole("heading", { name: t("Agely matched you with {0}", "Ruth Adeyemi") })).toBeVisible();
    await productAudit(page, `${locale} buyer match`);
    await page.goto(`/?lang=${locale}#/app/buyer/brief`);
    await expect(problem).toHaveValue(typedProblem);
  });
}

test("Hindi booking preserves the amount, names and time in the calendar file", async ({ page }) => {
  await seedExperts(page);
  await page.goto("/?lang=en#/app");
  await productSignIn(page, "sam@example.com");
  await page.getByRole("button", { name: "Continue as a buyer" }).click();
  await page.getByRole("link", { name: "Describe my problem" }).click();
  for (const source of ["I'm about to sign with a contract manufacturer for the first time.", "30 minutes", "$50 to $100"]) {
    await page.getByRole("button", { name: source, exact: true }).click();
  }
  await page.getByRole("button", { name: "Confirm my brief" }).click();
  await page.getByRole("link", { name: "Propose a session" }).click();
  await page.getByRole("combobox", { name: "Language" }).selectOption("hi");
  await expect(page).toHaveURL(/\?lang=hi#\/app\/buyer\/proposal$/);

  const t = createTranslator("hi");
  const buyer = "Sam Ortiz";
  const expert = "Ruth Adeyemi";
  const price = page.getByLabel(t("Price per 15 minutes"), { exact: true });
  await page.getByLabel(t("Your name, as {0} will see it", expert)).fill(buyer);
  await price.fill("७५");
  const time = page.getByRole("radio").first();
  await time.check();
  const startsAt = await time.inputValue();
  await page.getByRole("button", { name: t("Send my proposal") }).click();
  await expect(page.getByRole("heading", { name: t("Waiting for {0} to answer", expert) })).toBeVisible();
  expect(await paymentCount(page)).toBe(0);

  await page.getByRole("combobox", { name: t("Language") }).selectOption("en");
  await productSignOut(page);
  await productSignIn(page, "seed-ruth@example.com");
  await page.getByRole("link", { name: "Open my inbox" }).click();
  await page.getByRole("combobox", { name: "Language" }).selectOption("hi");
  await page.locator(".card").filter({ hasText: buyer }).getByRole("button", { name: t("Accept"), exact: true }).click();
  await expect(page.getByRole("heading", { name: t("Session confirmed") })).toBeVisible();
  await expect(page.getByText(t("{0} is held until the session has taken place.", formatMoney(150, "hi")))).toBeVisible();
  expect(await paymentCount(page)).toBe(1);

  const downloading = page.waitForEvent("download");
  await page.getByRole("link", { name: t("Add to my calendar") }).click();
  const downloaded = await downloading;
  const calendar = readFileSync(await downloaded.path(), "utf8").replaceAll("\r\n ", "");
  expect(calendar).toContain(`SUMMARY:${t("Agely session: {0} and {1}", buyer, expert)}`);
  expect(calendar).toContain(`DTSTART:${startsAt.replace(/[-:]|\.\d{3}/g, "")}`);
  expect(calendar).toContain("I'm about to sign with a contract manufacturer for the first time.");
});

test("browser back keeps the selected language in the marketplace URL", async ({ page }) => {
  await page.goto("/?lang=en#/app");
  await productSignIn(page, "ruth@example.com");
  await page.getByRole("link", { name: "Account" }).click();
  await expect(page).toHaveURL(/\?lang=en#\/app\/account$/);
  await page.getByRole("combobox", { name: "Language" }).selectOption("fr");
  await expect(page).toHaveURL(/\?lang=fr#\/app\/account$/);
  await page.goBack();
  await expect(page).toHaveURL(/\?lang=fr#\/app\/home$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "fr");
  await page.goForward();
  await expect(page).toHaveURL(/\?lang=fr#\/app\/account$/);
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "fr");
});

test("Tamil price fits the stand-in card on a phone", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seedExperts(page);
  await page.goto("/?lang=en#/app");
  await productSignIn(page, "seed-ruth@example.com");
  await page.getByRole("combobox", { name: "Language" }).selectOption("ta");
  await page.goto("/?lang=ta#/app/expert/price");
  const t = createTranslator("ta");
  await expect(page.getByRole("heading", { name: t("What should you charge?") })).toBeVisible();
  const price = page.locator(".stand-in .big-price");
  await expect(price).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  expect(await price.evaluate((element) => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(0);
});

for (const blocked of ["access", "reads", "writes"] as const) {
  test(`blocked storage ${blocked} leaves a localized way back to the walkthrough`, async ({ page }) => {
    await page.addInitScript((mode) => {
      const block = () => { throw new DOMException("Storage blocked by test", "SecurityError"); };
      if (mode === "access") Object.defineProperty(window, "localStorage", { get: block });
      else if (mode === "reads") Storage.prototype.getItem = block;
      else Storage.prototype.setItem = block;
    }, blocked);
    await page.goto("/?lang=fr#/app");
    const t = createTranslator("fr");
    await expect(page.locator("html")).toHaveAttribute("lang", "fr");
    await expect(page.getByRole("heading", { name: "Le stockage du navigateur est indisponible" })).toBeVisible();
    await expect(page.getByText(t("Agely needs browser storage to keep this try-out on your device. Allow site data in your browser settings, then reload this page."))).toBeVisible();
    await page.getByRole("link", { name: t("Back to the walkthrough") }).click();
    await expect(page.getByRole("heading", { name: t("Experience shouldn't retire.") })).toBeVisible();
    await expect(page).toHaveURL(/\?lang=fr#\/$/);
  });
}
