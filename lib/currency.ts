/**
 * Single source of truth for money formatting. Debek is built for South
 * Sudanese clinics — every amount in the UI (fees, invoices, payments,
 * reports) is South Sudanese Pounds. Thousand separators matter here
 * more than they would for a small-denomination currency, since typical
 * consultation fees run into the thousands of SSP.
 */
export function formatMoney(value: number): string {
  return `SSP ${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
