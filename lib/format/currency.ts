/**
 * Shared currency formatters. Every place in the app that displays a dollar
 * amount should use one of these helpers — never inline `Intl.NumberFormat`
 * and never hand-rolled compact formatters like `$${(n/1000).toFixed(0)}k`
 * (which renders $4,000,000 as the lie "$4000k").
 *
 * Two helpers by design:
 * - `formatCurrency` is the default — full precision, no compact notation.
 *   Use everywhere a dollar amount needs to be read exactly.
 * - `formatCurrencyCompact` trades precision for screen real estate. Use
 *   only in summary tiles and dashboard cards where the exact digits don't
 *   matter and `$4M` is strictly clearer than `$4,000,000`.
 *
 * CAD is the default because KrewPact is a Canada-first product. Callers
 * working with USD/other currencies must pass an explicit currency code.
 */

export function formatCurrency(value: number, currency: string = 'CAD'): string {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatCurrencyCompact(value: number, currency: string = 'CAD'): string {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency,
    notation: 'compact',
    // Drop the trailing `.0` so round values render as `$4M`, not `$4.0M`.
    // Non-round values still get one decimal: `$1.25M` → `$1.3M`.
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(value);
}
