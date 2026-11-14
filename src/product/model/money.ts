import { formatMoney, type Locale } from "../../../site/i18n/core.js";

/**
 * Money for the product. Prices per 15 minutes stay whole dollars, as in the walkthrough; session
 * totals, the fee and what an expert is owed are integer cents (FR-020, research R9).
 */

/** Agely's fee as a percentage of the session price. Defined once. */
export const FEE_PERCENT = 10;

function positiveInteger(value: number, what: string): void {
  if (!Number.isInteger(value) || value < 1) throw new RangeError(`${what} must be a positive whole number, got ${value}`);
}

export function sessionTotalCents(units: number, pricePerUnitDollars: number): number {
  positiveInteger(units, "units");
  positiveInteger(pricePerUnitDollars, "price per 15 minutes");
  return units * pricePerUnitDollars * 100;
}

/** Rounded half up. Integer arithmetic only, so no cent is lost to floating point. */
export function feeCents(amountCents: number): number {
  positiveInteger(amountCents, "amount");
  return Math.floor((amountCents * FEE_PERCENT + 50) / 100);
}

export function owedCents(amountCents: number): number {
  return amountCents - feeCents(amountCents);
}

/** "$150", "$58.50", "$1,234.56". */
export function formatCents(cents: number, locale: Locale = "en"): string {
  return formatMoney(cents / 100, locale, cents % 100 === 0 ? 0 : 2);
}
