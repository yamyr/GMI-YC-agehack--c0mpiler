import { formatDate, type Locale } from "../../../site/i18n/core.js";
/** Research R7: the session is two days after today at 10:00 local time, so the demo never looks stale. */
export function sessionStart(now: Date): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2, 10, 0, 0, 0);
}

/** e.g. "Friday, November 13 at 10:00 AM". */
export function formatSessionTime(date: Date, locale: Locale = "en"): string {
  return formatDate(date, locale, { weekday: "long", month: "long", day: "numeric", hour: "numeric", minute: "2-digit" });
}
