import { createTranslator, formatDate, formatNumber, type Locale } from "../../../site/i18n/core.js";

/**
 * Times a buyer can pick with one tap (research R16): 10:00 and 14:00 on the next three
 * weekdays, in the buyer's own time zone. Never today, so the expert has time to answer.
 */
export function suggestedTimes(now: Date): Date[] {
  const times: Date[] = [];
  const day = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let weekdays = 0;
  while (weekdays < 3) {
    day.setDate(day.getDate() + 1);
    if (day.getDay() === 0 || day.getDay() === 6) continue;
    weekdays += 1;
    for (const hour of [10, 14]) times.push(new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour));
  }
  return times;
}

/** "Thursday 19 November at 10:00 EST": the viewer's own time zone, named so nobody has to guess. */
export function formatWhen(instant: string, locale: Locale = "en"): string {
  return formatDate(new Date(instant), locale, { weekday: "long", day: "numeric", month: "long", hour: "numeric", minute: "2-digit", timeZoneName: "short" });
}

export function lengthText(units: number, locale: Locale = "en"): string {
  const t = createTranslator(locale);
  const minutes = units * 15;
  if (minutes === 60) return t("1 hour");
  if (minutes === 120) return t("2 hours");
  if (minutes > 60 && minutes < 120) return t("1 hour {0} minutes", formatNumber(minutes - 60, locale));
  return t("{0} minutes", formatNumber(minutes, locale));
}
