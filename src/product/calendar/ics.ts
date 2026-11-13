/**
 * A calendar file for one session (research R10). Times are UTC instants, so each person's
 * calendar shows the session in their own time zone. Follows RFC 5545: CRLF line endings,
 * escaped text, and lines folded at 75 characters.
 */
export interface IcsEvent {
  readonly uid: string;
  readonly startsAt: string;
  readonly endsAt: string;
  /** When the file was made. Passed in so the same session always yields the same file. */
  readonly stampedAt: string;
  readonly summary: string;
  readonly description: string;
  readonly url: string;
}

const utc = (instant: string): string => new Date(instant).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
const escapeText = (text: string): string => text.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

function fold(line: string): string[] {
  const parts: string[] = [];
  let rest = line;
  while (rest.length > 75) {
    parts.push(rest.slice(0, 75));
    rest = ` ${rest.slice(75)}`;
  }
  parts.push(rest);
  return parts;
}

export function sessionIcs(event: IcsEvent): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Agely//Sessions//EN",
    "BEGIN:VEVENT",
    `UID:${event.uid}@agely.dev`,
    `DTSTAMP:${utc(event.stampedAt)}`,
    `DTSTART:${utc(event.startsAt)}`,
    `DTEND:${utc(event.endsAt)}`,
    `SUMMARY:${escapeText(event.summary)}`,
    `DESCRIPTION:${escapeText(event.description)}`,
    `URL:${event.url}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return `${lines.flatMap(fold).join("\r\n")}\r\n`;
}
