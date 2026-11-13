import { readFileSync } from "node:fs";
import { Window } from "happy-dom";
import { afterEach, expect, it, vi } from "vitest";

const html = readFileSync(new URL("./index.html", import.meta.url), "utf8");

async function openSimulator(url) {
  const window = new Window({ url });
  window.document.write(html);
  for (const name of ["document", "history", "location", "navigator"]) vi.stubGlobal(name, window[name]);
  vi.stubGlobal("window", window);
  vi.stubGlobal("matchMedia", window.matchMedia.bind(window));
  vi.resetModules();
  await import("./app.js");
  return window;
}

afterEach(() => vi.unstubAllGlobals());

it("keeps the displayed week and results when the scenario reloads in another language", async () => {
  const english = await openSimulator("https://agely.dev/simulator/?lang=en#experts=15&seed=37");
  const slider = english.document.getElementById("week");
  slider.value = "3";
  slider.dispatchEvent(new english.Event("input"));
  expect(english.document.getElementById("week-label").textContent).toBe("Week 3 of 12");

  const url = new URL(english.location.href);
  url.searchParams.set("lang", "de");
  const german = await openSimulator(url.href);
  expect(german.document.getElementById("week-label").textContent).toBe("Woche 3 von 12");
  expect(german.document.getElementById("p-experts").value).toBe("15");
  expect(german.document.querySelectorAll("#weeks-table tbody tr")).toHaveLength(3);
  const results = (window) => [...window.document.querySelectorAll("#weeks-table tbody td")].map((cell) => cell.textContent.replace(/\D/g, ""));
  expect(results(german)).toEqual(results(english));
});

it("shows the final week for old scenario links or invalid week values", async () => {
  for (const hash of ["#weeks=4", "#weeks=4&week=99", "#weeks=4&week=2.5", "#weeks=4&week=0"]) {
    const window = await openSimulator(`https://agely.dev/simulator/?lang=en${hash}`);
    expect(window.document.getElementById("week-label").textContent, hash).toBe("Week 4 of 4");
  }
});
