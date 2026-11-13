import { describe, expect, it } from "vitest";
import { suggestedTimes } from "./times";

describe("suggested session times", () => {
  it("offers 10:00 and 14:00 on the next three weekdays, in order, all in the future", () => {
    for (const start of ["2026-11-13T09:00:00", "2026-11-14T18:30:00", "2026-11-15T23:59:00", "2026-11-18T10:00:00"]) {
      const now = new Date(start);
      const times = suggestedTimes(now);
      expect(times).toHaveLength(6);
      expect(times.map((t) => t.getHours())).toEqual([10, 14, 10, 14, 10, 14]);
      for (const t of times) {
        expect(t.getTime()).toBeGreaterThan(now.getTime());
        expect([0, 6]).not.toContain(t.getDay());
        expect(t.getMinutes() + t.getSeconds() + t.getMilliseconds()).toBe(0);
      }
      expect([...times].sort((a, b) => a.getTime() - b.getTime())).toEqual(times);
      expect(new Set(times.map((t) => t.toDateString())).size).toBe(3);
      // Never today: the expert needs time to answer.
      expect(times[0]?.toDateString()).not.toBe(now.toDateString());
    }
  });
});
