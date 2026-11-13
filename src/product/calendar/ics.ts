/**
 * A calendar file for one session (research R10). Times are UTC instants, so each person's
 * calendar shows the session in their own time zone. Follows RFC 5545: CRLF line endings,
 * escaped text, and lines folded at 75 UTF-8 octets.
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
const escapeText = (text: string): string => text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r\n?|\n/g, "\\n");
const utf8 = new TextEncoder();

function fold(line: string): string[] {
  const parts: string[] = [];
  let part = "";
  let bytes = 0;
  for (const character of line) {
    const size = utf8.encode(character).length;
    if (bytes + size > 75) {
      parts.push(part);
      part = " ";
      bytes = 1;
    }
    part += character;
    bytes += size;
  }
  parts.push(part);
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
