import { describe, expect, it } from "vitest";
import { parseDollars } from "../../i18n/digits";

describe("whole-dollar input", () => {
  // A French/German grouping or decimal mark must never silently change a USD amount.
  it.each(["1.000", "1,000", "1 000", "1e3", "60.00", "", "USD 60", "६०,०००", "௬௦.௦௦", "₹६०"])("rejects ambiguous or non-integer notation %j", (text) => {
    expect(Number.isNaN(parseDollars(text))).toBe(true);
  });
  it.each([["60", 60], [" $90 ", 90], ["１２３", 123], ["६०", 60], ["௯௦", 90], ["$६५", 65]])("reads an ungrouped whole-dollar amount %j", (text, amount) => {
    expect(parseDollars(String(text))).toBe(amount);
  });
});
