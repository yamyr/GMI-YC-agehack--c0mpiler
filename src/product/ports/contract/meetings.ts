import { describe, expect, it } from "vitest";
import type { MeetingsPort } from "../index";

const START = "2026-11-20T15:00:00.000Z";
const END = "2026-11-20T15:30:00.000Z";

/** Behaviour every MeetingsPort adapter must show. */
export function meetingsContract(name: string, make: () => MeetingsPort): void {
  describe(`MeetingsPort contract: ${name}`, () => {
    it("returns a link that can be opened", async () => {
      const link = await make().createLink("s1", START, END);
      expect(new URL(link.url).protocol).toBe("https:");
      expect(link.provider.length).toBeGreaterThan(0);
    });

    it("returns the same link for the same session, and a different one for another", async () => {
      const meetings = make();
      const first = await meetings.createLink("s1", START, END);
      expect(await meetings.createLink("s1", START, END)).toEqual(first);
      expect((await meetings.createLink("s2", START, END)).url).not.toBe(first.url);
    });

    it("marks a stand-in link, and keeps it on a reserved example domain", async () => {
      const meetings = make();
      const link = await meetings.createLink("s1", START, END);
      expect(link.standIn).toBe(!meetings.status.connected);
      if (link.standIn) expect(new URL(link.url).hostname).toMatch(/(^|\.)example$|\.example\.(com|org|net)$|^example\.(com|org|net)$/);
      expect(meetings.status.service).toBe("meetings");
    });
  });
}
