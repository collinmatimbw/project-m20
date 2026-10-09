/**
 * Currency display.
 *
 * All component costs in the catalogue are authored in Indian Rupees, because
 * that is the source catalogue's market. Everything the user sees is presented in
 * Tanzanian Shillings, converted at render time from the single rate below.
 *
 * The shilling has no commonly used minor unit, so amounts are rounded to the
 * nearest 100 TSh for readability.
 */

/** Bank of Tanzania indicative reference rate, TZS per INR. */
export const INR_TO_TZS = 27.78;

export const CURRENCY = 'TSh';
export const CURRENCY_LONG = 'TSh';

/** Converts an INR amount to TSh, rounded to the nearest 100. */
export function inrToTSh(inr: number): number {
  if (!Number.isFinite(inr)) return 0;
  return Math.round((inr * INR_TO_TZS) / 100) * 100;
}

/** Formats a TSh amount, e.g. 450 INR -> "TSh 12,500". */
export function formatTSh(tzs: number): string {
  if (!Number.isFinite(tzs)) return `${CURRENCY} 0`;
  return `${CURRENCY} ${Math.round(tzs).toLocaleString('en-TZ')}`;
}

/** Convenience: INR in, formatted TSh out. */
export function formatInrAsTSh(inr: number): string {
  return formatTSh(inrToTSh(inr));
}
