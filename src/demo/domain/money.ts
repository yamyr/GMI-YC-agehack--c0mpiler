/** Whole-dollar USD, e.g. "$75", "$1,050". */
export function formatUsd(amount: number): string {
  return `$${amount.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}
