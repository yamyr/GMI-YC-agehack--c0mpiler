import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Window } from "happy-dom";
import { diagnose, normalise, simulate, summarise, PARAMS } from "../simulator/engine.js";

const costs = JSON.parse(readFileSync(new URL('../costs/costs.json', import.meta.url), 'utf8'));
afterEach(() => { vi.unstubAllGlobals(); vi.resetModules(); });

describe('localized website tools preserve canonical values', () => {
  it('registers descriptive ledger titles while preserving product names', () => {
    const inventory = JSON.parse(readFileSync(new URL('./messages/website-extra.json', import.meta.url), 'utf8'));
    for (const source of ['Cloudflare, one year', 'Domain name agely.dev, five years', 'Demo video, Seedance 2.5 at 720p on Higgsfield', 'GitHub repository and Actions']) expect(inventory).toContain(source);
  });
  it('describes zero, one and multiple sessions without incorrect plural nouns', async () => {
    const { formatExpertDescription } = await import('../simulator/presentation.js');
    for (const count of [0, 1, 2]) {
      const expert = { name: 'Margaret', age: 68, years: 34, skills: [0], price: {min:60,max:90}, capacity:count, sessions:count, workflows:count };
      const description = formatExpertDescription(expert, 150, 12, 12, 'en');
      expect(description).toContain(`Weekly session capacity: ${count}.`);
      expect(description).toContain(`Sessions completed: ${count}. Approved workflows: ${count}.`);
      expect(description).not.toContain('1 sessions');
      expect(description).not.toContain('1 approved workflows');
    }
  });
  it('changes diagnosis presentation without changing simulation or parameter identifiers', () => {
    const params = normalise({ seed: 37 });
    const result = simulate(params);
    const summary = summarise(result, params.weeks);
    const before = structuredClone({params, result, summary, PARAMS});
    const output = diagnose(summary, params, (source) => `FR: ${source}`);
    expect(output).toMatch(/^FR: /);
    expect({params, result, summary, PARAMS}).toEqual(before);
    expect(simulate(params)).toEqual(result);
  });
  it('formats the ledger in the chosen locale while retaining amounts and raw evidence', async () => {
    const window = new Window({url:'https://agely.dev/costs/?lang=de'});
    window.document.write(readFileSync(new URL('../costs/index.html', import.meta.url), 'utf8'));
    vi.stubGlobal('window', window);
    vi.stubGlobal('document', window.document);
    vi.stubGlobal('navigator', window.navigator);
    const original = structuredClone(costs);
    vi.stubGlobal('fetch', vi.fn(async () => ({ok:true, json:async()=>costs})));
    await import('../costs/costs.js');
    const amounts = [...window.document.querySelectorAll('#ledger tbody .amount')].map(n=>n.textContent);
    expect(amounts).toContain(new Intl.NumberFormat('de-DE',{style:'currency',currency:'USD',minimumFractionDigits:2,maximumFractionDigits:2}).format(200));
    for(const entry of costs.entries.filter(e=>e.evidence)) expect(window.document.body.textContent).toContain(entry.evidence);
    expect(costs).toEqual(original);
  });
});
