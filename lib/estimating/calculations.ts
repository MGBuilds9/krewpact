/**
 * Pure calculation functions for estimates.
 * All monetary values are rounded to 2 decimal places.
 */

/**
 * Calculate the total for a single estimate line.
 * Formula: round(quantity * unitCost * (1 + markupPct / 100), 2)
 */
export function calculateLineTotal(
  quantity: number,
  unitCost: number,
  markupPct: number,
): number {
  const raw = quantity * unitCost * (1 + markupPct / 100);
  return Math.round(raw * 100) / 100;
}

interface EstimateLine {
  line_total: number;
  is_optional: boolean;
}

interface EstimateTotals {
  subtotal_amount: number;
  tax_amount: number;
  total_amount: number;
}

/**
 * Calculate subtotal, HST (13%), and total from estimate lines.
 * Optional lines are excluded from the subtotal.
 */
export function calculateEstimateTotals(lines: EstimateLine[]): EstimateTotals {
  const subtotal_amount = lines
    .filter((line) => !line.is_optional)
    .reduce((sum, line) => {
      // Use rounding at each addition step to avoid floating point accumulation
      return Math.round((sum + line.line_total) * 100) / 100;
    }, 0);

  const tax_amount = Math.round(subtotal_amount * 13) / 100;
  const total_amount = Math.round((subtotal_amount + tax_amount) * 100) / 100;

  return { subtotal_amount, tax_amount, total_amount };
}

/**
 * Generate an estimate number: EST-YYYY-NNN
 * @param existingCount Number of existing estimates (0-based)
 */
export function generateEstimateNumber(existingCount: number): string {
  const year = new Date().getFullYear();
  const seq = String(existingCount + 1).padStart(3, '0');
  return `EST-${year}-${seq}`;
}
