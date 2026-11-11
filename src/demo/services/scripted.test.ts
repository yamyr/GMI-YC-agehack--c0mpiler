import { describe, expect, it } from "vitest";
import { scriptedMeetings, scriptedPayments } from "./scripted";

describe("scripted payments", () => {
  it("holds a whole-dollar amount and marks it as a demo", () => {
    expect(scriptedPayments.hold(150)).toEqual({ status: "held", amount: 150, demo: true });
  });

  it.each([0, -1, 1.5, Number.NaN])("refuses to hold %s", (amount) => {
    expect(() => scriptedPayments.hold(amount)).toThrow();
  });

  it("releases a held payment", () => {
    const held = scriptedPayments.hold(150);
    expect(scriptedPayments.release(held)).toEqual({ status: "released", amount: 150, demo: true });
  });

  it("refuses to release a payment that is not held", () => {
    const released = scriptedPayments.release(scriptedPayments.hold(150));
    expect(() => scriptedPayments.release(released)).toThrow();
    expect(() => scriptedPayments.release({ status: "none", amount: 0, demo: true })).toThrow();
  });
});

describe("scripted meetings", () => {
  it("creates a reserved-domain demo link that never resolves to a real meeting", () => {
    expect(scriptedMeetings.createLink("s1")).toEqual({
      url: "https://meet.example.com/agely-demo-s1",
      provider: "Google Meet",
      isDemo: true,
    });
  });
});
