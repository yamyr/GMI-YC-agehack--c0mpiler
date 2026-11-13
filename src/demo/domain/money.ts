import { formatMoney, type Locale } from "../../../site/i18n/core.js";

/** Whole-dollar USD, displayed for the selected language. No currency conversion. */
export function formatUsd(amount: number, locale: Locale = "en"): string {
  return formatMoney(amount, locale);
}
