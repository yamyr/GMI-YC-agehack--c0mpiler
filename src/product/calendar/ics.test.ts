import { describe, expect, it } from "vitest";
import { sessionIcs } from "./ics";

const EVENT = { uid: "session-1", startsAt: "2026-11-20T15:00:00.000Z", endsAt: "2026-11-20T15:30:00.000Z", stampedAt: "2026-11-14T12:00:00.000Z", summary: "Agely session with Ruth Adeyemi", description: "Review my contract; terms, tooling\nand payment.", url: "https://meet.agely.example/session-1" };

describe("calendar file for a session", () => {
  const ics = sessionIcs(EVENT);
  const lines = ics.split("\r\n");

  it("is one event in one calendar, with CRLF line endings", () => {
    expect(lines[0]).toBe("BEGIN:VCALENDAR");
    expect(lines.filter((l) => l === "BEGIN:VEVENT")).toHaveLength(1);
    expect(lines.filter((l) => l === "END:VEVENT")).toHaveLength(1);
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
    expect(ics.replaceAll("\r\n", "")).not.toMatch(/[\r\n]/);
    expect(lines).toContain("VERSION:2.0");
    expect(lines.some((l) => l.startsWith("PRODID:"))).toBe(true);
  });

  it("gives the times as UTC instants, so each person's calendar shows their own time", () => {
    expect(lines).toContain("DTSTART:20261120T150000Z");
    expect(lines).toContain("DTEND:20261120T153000Z");
    expect(lines).toContain("DTSTAMP:20261114T120000Z");
  });

  it("carries the summary, the link and a stable id", () => {
    expect(lines).toContain("SUMMARY:Agely session with Ruth Adeyemi");
    expect(lines).toContain("URL:https://meet.agely.example/session-1");
    expect(lines).toContain("UID:session-1@agely.dev");
    expect(sessionIcs(EVENT)).toBe(ics);
  });

  it("escapes commas, semicolons and line breaks in text", () => {
    expect(lines).toContain("DESCRIPTION:Review my contract\\; terms\\, tooling\\nand payment.");
  });

  it("folds long lines at 75 octets, continuing with a space", () => {
    const long = sessionIcs({ ...EVENT, description: "x".repeat(200) });
    const folded = long.split("\r\n");
    expect(folded.every((l) => l.length <= 75)).toBe(true);
    expect(long.replaceAll("\r\n ", "")).toContain(`DESCRIPTION:${"x".repeat(200)}`);
  });
  it("folds translated text on UTF-8 boundaries", () => {
    const summary = "相談の予約 👩🏽‍💻 ".repeat(10);
    const calendar = sessionIcs({ ...EVENT, summary });
    const lines = calendar.split("\r\n");

    expect(lines.every((line) => new TextEncoder().encode(line).length <= 75)).toBe(true);
    expect(calendar.replaceAll("\r\n ", "")).toContain(`SUMMARY:${summary}`);
    expect(lines.every((line) => !/[\uD800-\uDFFF]/u.test(line))).toBe(true);
  });

});
