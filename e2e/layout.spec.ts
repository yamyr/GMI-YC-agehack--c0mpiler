import { expect, test } from "@playwright/test";
import { CHAPTER_NAMES, visitEveryStep } from "./helpers";

test("every step fits the window, keeps the demo label, and respects the 16px floor (SC-004, FR-026)", async ({ page }) => {
  await visitEveryStep(page, async (step) => {
    await expect(page.getByText("Demo — scripted data")).toBeVisible();

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, `horizontal overflow on “${step}”`).toBeLessThanOrEqual(0);

    const tooSmall = await page.evaluate(() => {
      const offenders: string[] = [];
      for (const el of Array.from(document.body.querySelectorAll<HTMLElement>("*"))) {
        const hasText = Array.from(el.childNodes).some((n) => n.nodeType === Node.TEXT_NODE && (n.textContent ?? "").trim() !== "");
        if (!hasText || el.offsetParent === null) continue;
        const size = Number.parseFloat(getComputedStyle(el).fontSize);
        if (size < 16) offenders.push(`${el.tagName}.${el.className} ${size}px`);
      }
      return offenders;
    });
    expect(tooSmall, `text below 16px on “${step}”`).toEqual([]);

    await expect(page.getByRole("button", { name: "Restart" })).toBeVisible();
  });
});

test("runs fully offline: no requests leave the local dev server (SC-005)", async ({ page, baseURL }) => {
  const origin = new URL(baseURL ?? "http://localhost").origin;
  const external: string[] = [];
  page.on("request", (request) => {
    const url = request.url();
    if (!url.startsWith(origin) && !url.startsWith("data:") && !url.startsWith("blob:")) external.push(url);
  });
  await page.goto("/");
  for (const chapter of CHAPTER_NAMES) {
    await page.getByRole("navigation", { name: "Chapters" }).getByRole("button", { name: chapter, exact: true }).click();
  }
  expect(external).toEqual([]);
});

test("every control is reachable by keyboard with a visible focus ring", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("navigation", { name: "Chapters" }).getByRole("button", { name: "Price", exact: true }).click();
  const seen = new Set<string>();
  for (let i = 0; i < 40; i += 1) {
    await page.keyboard.press("Tab");
    const focused = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (el === null || el === document.body) return null;
      const style = getComputedStyle(el);
      return { label: (el.textContent ?? el.getAttribute("aria-label") ?? el.id).trim(), outline: style.outlineStyle };
    });
    if (focused === null) continue;
    expect(focused.outline, `no focus ring on “${focused.label}”`).not.toBe("none");
    seen.add(focused.label);
  }
  expect([...seen]).toEqual(expect.arrayContaining(["Confirm my price", "Back", "Restart"]));
});
