import { expect, it } from "vitest";
import { localizedUrl, siteCheckLanguages } from "./site-check-url.js";

it("sets the document language without changing the product hash route", () => {
  expect(localizedUrl("http://localhost:1493", "/demo/#/app", "ta"))
    .toBe("http://localhost:1493/demo/?lang=ta#/app");
});

it("can check any supported language without expanding the default matrix", () => {
  expect(siteCheckLanguages()).toEqual(["en", "de", "fi", "zh-Hans", "uk", "ta", "hi"]);
  expect(siteCheckLanguages("fr")).toEqual(["fr"]);
  expect(() => siteCheckLanguages("xx")).toThrow("Unknown language filter");
});
