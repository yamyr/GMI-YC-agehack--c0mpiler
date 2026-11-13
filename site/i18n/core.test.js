import { afterEach, describe, expect, it, vi } from "vitest";
import { LOCALES, createTranslator, formatDate, formatList, formatMoney, formatNumber, initialLocale, interpolate, pluralCategory, resolveLocale, saveLocale } from "./core.js";

vi.mock("./catalogs/index.js", () => ({ catalogs: { fr: {
  "Hello {0}": "Bonjour {0}",
  "Wrong {0}": "Erreur {1}",
  "Empty": "",
} } }));

afterEach(() => vi.unstubAllGlobals());

describe("language negotiation", () => {
  it("offers English and exactly 17 requested languages", () => {
    expect(LOCALES.map(({ id }) => id)).toEqual(["en", "fr", "es", "de", "it", "zh-Hans", "ko", "ja", "da", "uk", "pl", "ro", "nb", "fi", "id", "tl", "ta", "hi"]);
    expect(new Set(LOCALES.map(({ label }) => label)).size).toBe(18);
  });
  it("resolves region tags and explicit supported aliases in priority order", () => {
    for (const [input, expected] of [["fr-CA", "fr"], ["ZH-cn", "zh-Hans"], ["zh-Hans-SG", "zh-Hans"], ["no-NO", "nb"], ["fil-PH", "tl"], ["id-ID", "id"], ["uk-UA", "uk"], ["ta-IN", "ta"], ["hi-IN", "hi"]]) expect(resolveLocale([input])).toBe(expected);
    expect(resolveLocale(["zh-TW", "nn-NO", "fr-CA"])).toBe("fr");
    expect(resolveLocale(["bad!!", "en_US", "xx"])).toBe("en");
  });
  it("prefers explicit query then saved language then browser then English", () => {
    const getItem = vi.fn(() => "de");
    vi.stubGlobal("window", { location: { search: "?lang=ja" }, localStorage: { getItem } });
    vi.stubGlobal("navigator", { languages: ["fr-CA"] });
    expect(initialLocale()).toBe("ja");
    window.location.search = "?lang=unknown";
    expect(initialLocale()).toBe("de");
    getItem.mockReturnValue("unknown");
    expect(initialLocale()).toBe("fr");
    vi.stubGlobal("navigator", { languages: ["xx"] });
    expect(initialLocale()).toBe("en");
  });
  it("survives storage failures while retaining browser choice", () => {
    vi.stubGlobal("window", { location: { search: "" }, get localStorage() { throw new Error("denied"); } });
    vi.stubGlobal("navigator", { languages: ["ko-KR"] });
    expect(initialLocale()).toBe("ko");
    expect(() => saveLocale("fr")).not.toThrow();
  });
  it("writes only the language preference", () => {
    const setItem = vi.fn();
    vi.stubGlobal("window", { localStorage: { setItem } });
    saveLocale("pl");
    expect(setItem).toHaveBeenCalledWith("agely.locale", "pl");
  });
});

describe("text messages", () => {
  it("translates catalog text and falls back if a draft loses a slot", () => {
    const t = createTranslator("fr");
    expect(t("Hello {0}", "Margaret")).toBe("Bonjour Margaret");
    expect(t("Wrong {0}", "$75")).toBe("Wrong $75");
    expect(t("Empty")).toBe("Empty");
    expect(t("toString")).toBe("toString");
  });
  it("interpolates once and keeps unprovided/literal slots readable", () => {
    expect(interpolate("Hello {0}, {1}. {0}", ["{1}", "<script>"])).toBe("Hello {1}, <script>. {1}");
    expect(interpolate("{title} {0} {2}", ["A"])).toBe("{title} A {2}");
  });
  it("uses readable English when a translation is missing", () => {
    expect(createTranslator("fr")("An unknown message for {0}", "Margaret")).toBe("An unknown message for Margaret");
  });
});

describe("local formatting without changing money or timezone", () => {
  it("uses USD and locale separators, never currency conversion", () => {
    expect(formatMoney(1050, "en")).toBe("$1,050");
    expect(formatMoney(1050, "de")).toMatch(/1\.050.*\$/);
    expect(formatMoney(75.5, "fr", 2)).toMatch(/75,50.*\$US/);
    expect(formatNumber(1234.5, "de")).toBe("1.234,5");
    expect(formatNumber(1050000, "hi")).toBe("10,50,000");
    expect(formatNumber(1050000, "ta")).toBe("10,50,000");
    expect(formatMoney(1050000, "hi")).toContain("10,50,000");
  });
  it("formats dates and lists with a selected locale", () => {
    const date = new Date("2026-11-13T10:00:00Z");
    expect(formatDate(date, "fr", { month: "long", timeZone: "UTC" })).toBe("novembre");
    expect(formatList(["A", "B", "C"], "de")).toBe("A, B und C");
  });
  it("handles plural categories beyond English and formatter support for every locale", () => {
    expect(pluralCategory(1, "pl")).toBe("one");
    expect(pluralCategory(2, "pl")).toBe("few");
    expect(pluralCategory(5, "pl")).toBe("many");
    expect(pluralCategory(1, "ja")).toBe("other");
    for (const { id } of LOCALES) {
      expect(formatMoney(1050, id)).toBeTruthy();
      expect(formatDate(new Date(), id)).toBeTruthy();
      expect(formatList(["A", "B"], id)).toBeTruthy();
    }
  });
});
