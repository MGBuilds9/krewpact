/**
 * Format a number as CAD currency.
 */
export function fmtCAD(n: number): string {
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(n);
}
