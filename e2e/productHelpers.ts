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

// The stand-in store's key and shape (src/product/standins/store.ts). Seeding writes the same
// document the product reads, so these tests need no hidden back door in the app.
const STORE_KEY = "agely.product.v1";

interface SeedExpert {
  readonly id: string;
  readonly name: string;
  readonly years: number;
  readonly tag: string;
  readonly label: string;
  readonly price: readonly [number, number];
}

const SEED_EXPERTS: readonly SeedExpert[] = [
  { id: "seed-ruth", name: "Ruth Adeyemi", years: 34, tag: "contract-manufacturing", label: "Contract manufacturing terms", price: [60, 90] },
  { id: "seed-harold", name: "Harold Brooks", years: 30, tag: "hospital-operations", label: "Hospital and clinic operations", price: [40, 60] },
  { id: "seed-lin", name: "Lin Zhao", years: 38, tag: "contract-manufacturing", label: "Contract manufacturing terms", price: [120, 160] },
];

/** Stores three published experts before the app loads: one fit, one without the skill, one priced out. */
export async function seedExperts(page: Page): Promise<void> {
  await page.addInitScript(
    ({ key, experts }) => {
      if (localStorage.getItem(key) !== null) return;
      const doc: Record<string, Record<string, unknown>> = { account: {}, profile: {}, brief: {}, match: {}, proposal: {}, session: {}, payment: {} };
      for (const e of experts) {
        doc.account[e.id] = { id: e.id, email: `${e.id}@example.com`, name: e.name, roles: ["expert"], activeRole: "expert", createdAt: "2026-11-01T00:00:00.000Z" };
        doc.profile[e.id] = {
          id: e.id,
          headline: `${e.years} years in the field.`,
          location: "",
          yearsExperience: e.years,
          skills: [{ id: `${e.id}-skill`, tag: e.tag, label: e.label, description: "", source: { kind: "interview", turn: 1 } }],
          exampleProblems: [],
          priceRange: { min: e.price[0], max: e.price[1] },
          priceConfirmed: true,
          state: "published",
          selfDeclared: true,
        };
      }
      localStorage.setItem(key, JSON.stringify(doc));
    },
    { key: STORE_KEY, experts: SEED_EXPERTS },
  );
}

/** Changes a stored profile's published state, as that expert would from their own account. */
export async function setProfileState(page: Page, profileId: string, state: "draft" | "published"): Promise<void> {
  await page.evaluate(
    ({ key, profileId, state }) => {
      const doc = JSON.parse(localStorage.getItem(key) ?? "{}") as { profile: Record<string, { state: string }> };
      const profile = doc.profile[profileId];
      if (profile === undefined) throw new Error(`no stored profile ${profileId}`);
      profile.state = state;
      localStorage.setItem(key, JSON.stringify(doc));
    },
    { key: STORE_KEY, profileId, state },
  );
}
