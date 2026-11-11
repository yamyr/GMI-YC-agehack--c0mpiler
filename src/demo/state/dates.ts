/** Research R7: the session is two days after today at 10:00 local time, so the demo never looks stale. */
export function sessionStart(now: Date): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2, 10, 0, 0, 0);
}

/** e.g. "Friday, November 13 at 10:00 AM". */
export function formatSessionTime(date: Date): string {
  const day = date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  const time = date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return `${day} at ${time}`;
}
