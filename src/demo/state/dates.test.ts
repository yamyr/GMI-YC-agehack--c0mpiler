import { describe, expect, it } from "vitest";
import { formatSessionTime, sessionStart } from "./dates";

describe("sessionStart", () => {
  it("schedules two days after today at 10:00 local time", () => {
    expect(sessionStart(new Date(2026, 10, 11, 15, 0, 0))).toEqual(new Date(2026, 10, 13, 10, 0, 0));
  });

  it("rolls over the end of a month", () => {
    expect(sessionStart(new Date(2026, 10, 30, 9, 0, 0))).toEqual(new Date(2026, 11, 2, 10, 0, 0));
  });
});

describe("formatSessionTime", () => {
  it("reads as a weekday, date and time", () => {
    const text = formatSessionTime(new Date(2026, 10, 13, 10, 0, 0));
    expect(text).toContain("Friday");
    expect(text).toContain("November 13");
    expect(text).toContain("10:00");
  });
});
