/**
 * Purchase order internal helpers — status transitions and total recalculation.
 * These are implementation details of purchase-orders.ts.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

import { logger } from '@/lib/logger';
import type { Database } from '@/types/supabase';

type PORow = Database['public']['Tables']['inventory_purchase_orders']['Row'];

export async function fetchPoForTransition(
  supabase: SupabaseClient<Database>,
  id: string,
): Promise<PORow> {
  const { data, error } = await supabase
    .from('inventory_purchase_orders')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) {
    logger.error('PO not found for transition', { error: error?.message, id });
    throw new Error(`PO not found: ${error?.message}`);
  }

  return data;
}

export async function updatePoStatus(
  supabase: SupabaseClient<Database>,
  id: string,
  status: Database['public']['Enums']['inventory_po_status'],
): Promise<PORow> {
  const { data, error } = await supabase
    .from('inventory_purchase_orders')
    .update({ status })
    .eq('id', id)
    .select()
    .single();

  if (error || !data) {
    logger.error('Failed to update PO status', { error: error?.message, id, status });
    throw new Error(`PO status update failed: ${error?.message}`);
  }

  return data;
}

export async function recalculatePoTotals(
  supabase: SupabaseClient<Database>,
  poId: string,
): Promise<void> {
  const { data: lines, error } = await supabase
    .from('inventory_po_lines')
    .select('line_total')
    .eq('po_id', poId);

  if (error) {
    logger.error('Failed to query lines for total recalculation', { error: error.message });
    throw new Error(`PO total recalculation failed: ${error.message}`);
  }

  const subtotal = (lines ?? []).reduce((sum, l) => sum + Number(l.line_total), 0);
  const totalAmount = Number(subtotal.toFixed(2));

  const { error: updateError } = await supabase
    .from('inventory_purchase_orders')
    .update({ subtotal, tax_amount: 0, total_amount: totalAmount })
    .eq('id', poId);

  if (updateError) {
    logger.error('Failed to update PO totals', { error: updateError.message });
    throw new Error(`PO total update failed: ${updateError.message}`);
  }
}
