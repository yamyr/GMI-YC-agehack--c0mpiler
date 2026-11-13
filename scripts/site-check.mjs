#!/usr/bin/env bun
// Checks the built website the way a reviewer would: opens every page at desktop and phone
// width, in light and dark, and reports anything a visitor would trip over.
//
//   bun run build:site && bun scripts/site-check.mjs [screenshot-dir] [--language=uk] [--view=phone]
//
// For each page it reports failed requests, script errors, horizontal overflow, text smaller
// than 16px (constitution principle I) and axe WCAG 2.1 AA violations. Screenshots are written
// only when a directory is given. Exits 1 if anything was found.
import { createServer } from "node:http";
import { existsSync, mkdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import AxeBuilder from "@axe-core/playwright";
import { chromium } from "@playwright/test";
import { localizedUrl, siteCheckLanguages } from "./site-check-url.js";

const PRODUCT_SIGN_IN = "/demo/#/app";
const PAGES = ["/", "/simulator/", "/costs/", "/demo/", PRODUCT_SIGN_IN];
const VIEWS = [
  { name: "desktop", width: 1440, height: 900, colorScheme: "light" },
  { name: "phone", width: 390, height: 844, colorScheme: "light" },
  { name: "desktop-dark", width: 1440, height: 900, colorScheme: "dark" },
];
const args = process.argv.slice(2);
const languageFilter = args.find((arg) => arg.startsWith("--language="))?.slice(11);
const viewFilter = args.find((arg) => arg.startsWith("--view="))?.slice(7);
if (viewFilter !== undefined && !VIEWS.some(({ name }) => name === viewFilter)) throw new Error("Unknown view filter");
const languages = siteCheckLanguages(languageFilter);
const views = VIEWS.filter(({ name }) => viewFilter === undefined || name === viewFilter);
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".mp4": "video/mp4", ".txt": "text/plain" };

const dist = fileURLToPath(new URL("../dist", import.meta.url));
if (!existsSync(join(dist, "demo", "index.html"))) {
  console.error("dist/ does not hold the website build. Run `bun run build:site` first.");
  process.exit(1);
}
const shots = args.find((arg) => !arg.startsWith("--"));
if (shots) mkdirSync(shots, { recursive: true });

const server = createServer((req, res) => {
  let path = normalize(decodeURIComponent(new URL(req.url, "http://x").pathname));
  let file = join(dist, path);
  if (!file.startsWith(dist)) return res.writeHead(403).end();
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, "index.html");
  if (!existsSync(file)) return res.writeHead(404).end();
  res.writeHead(200, { "content-type": TYPES[extname(file)] ?? "application/octet-stream" }).end(readFileSync(file));
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const base = `http://127.0.0.1:${server.address().port}`;

const browser = await chromium.launch();
const problems = [];
for (const language of languages) {
for (const view of views) {
  for (const path of PAGES) {
    // axe needs a context of its own, not the browser's implicit one.
    const context = await browser.newContext({ viewport: { width: view.width, height: view.height }, colorScheme: view.colorScheme });
    const page = await context.newPage();
    const where = `${path} (${language}, ${view.name})`;
    const note = (text) => problems.push(`${where}: ${text}`);
    page.on("pageerror", (e) => note(`script error: ${e.message}`));
    page.on("response", (r) => r.status() >= 400 && note(`${r.status()} ${new URL(r.url()).pathname}`));
    await page.goto(localizedUrl(base, path, language), { waitUntil: "networkidle" });
    if (await page.locator("html").getAttribute("lang") !== language) note("document language does not match the selected language");
    if (path === PRODUCT_SIGN_IN && !await page.locator("#product-email").isVisible()) note("product sign-in did not open");

    const layout = await page.evaluate(() => {
      const small = new Set();
      for (const el of document.body.querySelectorAll("*")) {
        const hasText = [...el.childNodes].some((n) => n.nodeType === Node.TEXT_NODE && n.textContent.trim() !== "");
        if (!hasText || el.offsetParent === null) continue;
        const size = Number.parseFloat(getComputedStyle(el).fontSize);
        // 0px is the simulator's way of hiding a label that a narrow bar cannot hold.
        if (size > 0 && size < 16) small.add(`${el.tagName.toLowerCase()}.${el.className} ${size}px`);
      }
      return { overflow: document.documentElement.scrollWidth - window.innerWidth, small: [...small] };
    });
    if (layout.overflow > 0) note(`page is ${layout.overflow}px wider than the window`);
    for (const s of layout.small) note(`text below 16px: ${s}`);
    // A number can spill over another card without increasing the document width.
    const clippedValues = await page.locator(".tile-value").evaluateAll((values) => values.filter((value) => value.scrollWidth > value.clientWidth).map((value) => value.textContent));
    for (const value of clippedValues) note(`statistic does not fit its card: ${value}`);
    const overlappingBudget = await page.evaluate(() => {
      const budget = document.querySelector(".ranges-budget-label");
      if (budget === null) return false;
      const bounds = budget.getBoundingClientRect();
      return [...document.querySelectorAll(".range-name")].some((name) => {
        const text = document.createRange();
        text.selectNodeContents(name);
        const other = text.getBoundingClientRect();
        return Math.min(bounds.right, other.right) - Math.max(bounds.left, other.left) > 1 &&
          Math.min(bounds.bottom, other.bottom) - Math.max(bounds.top, other.top) > 1;
      });
    });
    if (overlappingBudget) note("budget caption overlaps an expert's price label");

    const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    for (const v of violations) {
      for (const n of v.nodes) {
        const d = n.any[0]?.data;
        const detail = d?.contrastRatio ? ` ${d.fgColor} on ${d.bgColor} = ${d.contrastRatio}:1` : "";
        note(`axe ${v.id}: ${n.target.join(" ")}${detail}`);
      }
    }
    if (shots) await page.screenshot({ path: join(shots, `${path.replaceAll("/", "") || "home"}-${language}-${view.name}.png`), fullPage: true });
    await context.close();
  }
}
}
await browser.close();
server.close();

const unique = [...new Set(problems)];
console.log(unique.length ? unique.join("\n") : `No problems on ${PAGES.length} pages in ${views.length} views and ${languages.length} languages.`);
process.exit(unique.length ? 1 : 0);
