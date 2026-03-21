/**
 * Shared estimate totals recalculation.
 *
 * Reads all lines for an estimate, computes subtotal/tax/total,
 * and updates the parent estimate record.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

import { calculateEstimateTotals } from './calculations';

interface EstimateTotals {
  subtotal_amount: number;
  tax_amount: number;
  total_amount: number;
}

/**
 * Fetch all lines for an estimate, recalculate totals, and update the parent estimate.
 */
export async function recalculateParentTotals(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, 'public', any>,
  estimateId: string,
): Promise<EstimateTotals> {
  const { data: allLines } = await supabase
    .from('estimate_lines')
    .select('line_total, is_optional')
    .eq('estimate_id', estimateId);

  const rawLines = Array.isArray(allLines) ? allLines : allLines ? [allLines] : [];
  const lines = rawLines.map((l: Record<string, unknown>) => ({
    line_total: Number(l.line_total),
    is_optional: Boolean(l.is_optional),
  }));

  const totals = calculateEstimateTotals(lines);

  await supabase
    .from('estimates')
    .update({
      subtotal_amount: totals.subtotal_amount,
      tax_amount: totals.tax_amount,
      total_amount: totals.total_amount,
    })
    .eq('id', estimateId);

  return totals;
}
