import { expect, it } from "vitest";
import { localizedUrl } from "./site-check-url.js";

it("sets the document language without changing the product hash route", () => {
  expect(localizedUrl("http://localhost:1493", "/demo/#/app", "ta"))
    .toBe("http://localhost:1493/demo/?lang=ta#/app");
});
