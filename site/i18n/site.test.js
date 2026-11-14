import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Window } from "happy-dom";
import { applyTranslations, formatAmounts } from "./site.js";
import { createTranslator, LOCALES } from "./core.js";

afterEach(() => { vi.unstubAllGlobals(); vi.resetModules(); });

describe("static website localization", () => {
  it("keeps the visible brand in every home link's accessible name", () => {
    // Inflecting Agely into another word breaks voice-control matching of the visible label.
    for (const { id } of LOCALES) expect(createTranslator(id)('Agely home'), id).toMatch(/\bAgely\b/u);
  });
  it("remembers an explicit language URL for later visits without that URL", async () => {
    const window = new Window({ url: 'https://agely.dev/?lang=fr' });
    window.document.body.innerHTML = '<header></header><main></main>';
    window.localStorage.setItem('agely.locale', 'de');
    vi.stubGlobal('window', window);
    vi.stubGlobal('document', window.document);
    vi.stubGlobal('navigator', window.navigator);
    vi.resetModules();
    await import('./site.js');
    expect(window.document.documentElement.lang).toBe('fr');
    expect(window.localStorage.getItem('agely.locale')).toBe('fr');
  });
  it("marks each native language name with its own language in the rendered picker", async () => {
    const window = new Window({ url: 'https://agely.dev/?lang=ta' });
    window.document.body.innerHTML = '<header></header><main></main>';
    vi.stubGlobal('window', window);
    vi.stubGlobal('document', window.document);
    vi.stubGlobal('navigator', window.navigator);
    vi.stubGlobal('location', window.location);
    vi.resetModules();
    await import('./site.js');
    const options = [...window.document.querySelectorAll('#site-language option')];
    expect(options).toHaveLength(LOCALES.length);
    for (const option of options) expect(option.getAttribute('lang'), option.textContent).toBe(option.value);
  });
  it("preserves money word boundaries on the real landing page", () => {
    const document = new Window().document;
    document.write(readFileSync(new URL('../index.html', import.meta.url), 'utf8'));
    formatAmounts(document, 'en');
    expect(document.querySelector('.figure-line').textContent).toBe('$60–$90 per 15 minutes');
    formatAmounts(document, 'de');
    expect(document.querySelector('.figure-line').textContent).toMatch(/90.*\$ per 15 minutes/);
  });
  it("reserves the budget caption's height and keeps nested translation text in flow", () => {
    const window = new Window();
    window.document.write(readFileSync(new URL('../index.html', import.meta.url), 'utf8'));
    const style = window.document.createElement('style');
    style.textContent = readFileSync(new URL('../styles.css', import.meta.url), 'utf8');
    window.document.head.append(style);
    const outer = window.document.querySelector('.ranges-budget-label');
    expect(outer).not.toBeNull();
    const inner = outer.querySelector('[data-i18n]');
    expect(window.getComputedStyle(outer).position).toBe('relative');
    expect(window.getComputedStyle(inner).position).not.toBe('absolute');
  });

  it("preserves word boundaries around inline links", () => {
    const document = new Window().document;
    document.body.innerHTML = '<p><span data-i18n>Read </span><a href="#">the source</a><span data-i18n> for details.</span></p>';
    applyTranslations(document, (s) => ({ Read: 'Lire', 'for details.': 'pour les détails.' })[s] ?? s);
    expect(document.querySelector('p').textContent).toBe('Lire the source pour les détails.');
  });
  it("uses text rendering and translates marked accessible attributes", () => {
    const document = new Window().document;
    document.body.innerHTML = '<p data-i18n>Hello</p><button data-i18n-attrs="aria-label" aria-label="Open">Keep</button>';
    applyTranslations(document, (s) => ({ Hello: '<img src=x onerror=alert(1)>', Open: 'Ouvrir' })[s] ?? s);
    expect(document.querySelector('p').textContent).toBe('<img src=x onerror=alert(1)>');
    expect(document.querySelector('img')).toBeNull();
    expect(document.querySelector('button').getAttribute('aria-label')).toBe('Ouvrir');
  });
  it("marks all page prose and metadata explicitly", () => {
    const inventory = JSON.parse(readFileSync(new URL("./messages/website.json", import.meta.url), "utf8"));
    for (const page of ['index.html','simulator/index.html','costs/index.html','releases/index.html']) {
      const document = new Window().document;
      document.write(readFileSync(new URL(`../${page}`, import.meta.url), 'utf8'));
      const walker = document.createTreeWalker(document.body, 4);
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        if (!node.textContent.trim() || node.parentElement.closest('script,style,[data-i18n],[data-i18n-ignore]')) continue;
        expect(node.parentElement.outerHTML, page).toContain('data-i18n');
      }
      for (const node of document.querySelectorAll('[data-i18n]')) expect(inventory, page).toContain(node.textContent.trim().replace(/\s+/g, ' '));
      for (const node of document.querySelectorAll('[data-i18n-attrs]')) for (const attr of node.dataset.i18nAttrs.split(' ')) expect(inventory, page).toContain(node.getAttribute(attr));
      expect(document.querySelector('title').hasAttribute('data-i18n')).toBe(true);
      expect(document.querySelector('meta[name=description]').getAttribute('data-i18n-attrs')).toBe('content');
    }
  });
});
