import { formatUsd } from "./money";
import { contains, formatRange } from "./price";
import type { PriceRange } from "./types";

export function proposalTotal(units: number, pricePerUnit: number): number {
  return units * pricePerUnit;
}

export type ProposalCheck = { readonly ok: true } | { readonly ok: false; readonly message: string };

/** FR-019: a price outside the shared range is flagged before sending. */
export function validateProposal(pricePerUnit: number, shared: PriceRange): ProposalCheck {
  if (!Number.isInteger(pricePerUnit) || pricePerUnit < 1) {
    return { ok: false, message: "Please enter a whole-dollar price of at least $1." };
  }
  if (!contains(shared, pricePerUnit)) {
    return {
      ok: false,
      message: `${formatUsd(pricePerUnit)} is outside the range you and Margaret share (${formatRange(shared)}). Choose a price in that range.`,
    };
  }
  return { ok: true };
}
