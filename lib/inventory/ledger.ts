import type { SupabaseClient } from '@supabase/supabase-js';

import { logger } from '@/lib/logger';
import { createTransactionSchema } from '@/lib/validators/inventory';
import type { Database } from '@/types/supabase';

type LedgerInsert = Database['public']['Tables']['inventory_ledger']['Insert'];
type LedgerRow = Database['public']['Tables']['inventory_ledger']['Row'];

// Types requiring project_id
const PROJECT_REQUIRED_TYPES = new Set(['material_issue', 'material_return']);
// Types requiring reason_code
const REASON_REQUIRED_TYPES = new Set(['stock_adjustment', 'scrap']);

/**
 * Creates a single ledger entry.
 * Validates the input, computes value_change = qty_change * valuation_rate, and inserts.
 */
export async function createLedgerEntry(
  supabase: SupabaseClient<Database>,
  entry: Omit<LedgerInsert, 'id' | 'org_id' | 'created_at'>,
): Promise<LedgerRow> {
  // Validate via Zod schema (enforces qty != 0, project_id rules, reason_code rules)
  const parsed = createTransactionSchema.safeParse(entry);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    logger.error('Ledger entry validation failed', { errors: msg });
    throw new Error(`Invalid ledger entry: ${msg}`);
  }

  // Compute value_change = qty_change * valuation_rate
  const valuationRate = Number(entry.valuation_rate ?? 0);
  const qtyChange = Number(entry.qty_change);
  const valueChange = Number((qtyChange * valuationRate).toFixed(2));

  const row: Omit<LedgerInsert, 'id' | 'org_id' | 'created_at'> = {
    ...entry,
    valuation_rate: valuationRate,
    value_change: valueChange,
  };

  const { data, error } = await supabase
    .from('inventory_ledger')
    .insert(row as LedgerInsert)
    .select('id, item_id, division_id, transaction_type, qty_change, valuation_rate, value_change, location_id, counterpart_location_id, spot_id, serial_id, lot_number, project_id, reason_code, reference_id, reference_type, notes, transacted_by, transacted_at, org_id, created_at')
    .single();

  if (error) {
    logger.error('Failed to create ledger entry', { error: error.message, entry });
    throw new Error(`Ledger insert failed: ${error.message}`);
  }

  return data;
}

/**
 * Creates two paired entries for a stock transfer:
 * - Negative qty at the source location
 * - Positive qty at the destination location
 *
 * Both rows are inserted in a single batch — if one fails, neither is committed.
 */
export async function createTransferEntries(
  supabase: SupabaseClient<Database>,
  transfer: {
    item_id: string;
    division_id: string;
    qty: number;
    valuation_rate: number;
    from_location_id: string;
    to_location_id: string;
    from_spot_id?: string;
    to_spot_id?: string;
    serial_id?: string;
    lot_number?: string;
    notes?: string;
    transacted_by: string;
  },
): Promise<[LedgerRow, LedgerRow]> {
  if (transfer.qty <= 0) {
    throw new Error('Transfer qty must be positive');
  }

  const valuationRate = Number(transfer.valuation_rate);
  const qty = Number(transfer.qty);
  const valueChange = Number((qty * valuationRate).toFixed(2));

  const sourceEntry: Omit<LedgerInsert, 'id' | 'org_id' | 'created_at'> = {
    item_id: transfer.item_id,
    division_id: transfer.division_id,
    transaction_type: 'stock_transfer',
    qty_change: -qty,
    valuation_rate: valuationRate,
    value_change: -valueChange,
    location_id: transfer.from_location_id,
    spot_id: transfer.from_spot_id ?? null,
    counterpart_location_id: transfer.to_location_id,
    serial_id: transfer.serial_id ?? null,
    lot_number: transfer.lot_number ?? null,
    notes: transfer.notes ?? null,
    transacted_by: transfer.transacted_by,
  };

  const destEntry: Omit<LedgerInsert, 'id' | 'org_id' | 'created_at'> = {
    item_id: transfer.item_id,
    division_id: transfer.division_id,
    transaction_type: 'stock_transfer',
    qty_change: qty,
    valuation_rate: valuationRate,
    value_change: valueChange,
    location_id: transfer.to_location_id,
    spot_id: transfer.to_spot_id ?? null,
    counterpart_location_id: transfer.from_location_id,
    serial_id: transfer.serial_id ?? null,
    lot_number: transfer.lot_number ?? null,
    notes: transfer.notes ?? null,
    transacted_by: transfer.transacted_by,
  };

  const { data, error } = await supabase
    .from('inventory_ledger')
    .insert([sourceEntry as LedgerInsert, destEntry as LedgerInsert])
    .select('id, item_id, division_id, transaction_type, qty_change, valuation_rate, value_change, location_id, counterpart_location_id, spot_id, serial_id, lot_number, project_id, reason_code, reference_id, reference_type, notes, transacted_by, transacted_at, org_id, created_at');

  if (error) {
    logger.error('Failed to create transfer entries', { error: error.message });
    throw new Error(`Transfer insert failed: ${error.message}`);
  }

  if (!data || data.length !== 2) {
    throw new Error('Transfer insert returned unexpected number of rows');
  }

  return [data[0], data[1]];
}

/**
 * Returns the current qty_on_hand for an item at a specific location
 * by querying the materialized view `inventory_stock_summary`.
 * Returns 0 if no stock record exists.
 */
export async function getItemStockAtLocation(
  supabase: SupabaseClient<Database>,
  itemId: string,
  locationId: string,
): Promise<number> {
  const { data, error } = await supabase
    .from('inventory_stock_summary')
    .select('qty_on_hand')
    .eq('item_id', itemId)
    .eq('location_id', locationId)
    .maybeSingle();

  if (error) {
    logger.error('Failed to query stock summary', { error: error.message, itemId, locationId });
    throw new Error(`Stock query failed: ${error.message}`);
  }

  return Number(data?.qty_on_hand ?? 0);
}

/**
 * Calculates total material cost for a project by summing value_change
 * across all ledger entries referencing that project.
 */
export async function getJobMaterialCost(
  supabase: SupabaseClient<Database>,
  projectId: string,
): Promise<{ total_cost: number; entries: LedgerRow[] }> {
  const { data, error } = await supabase
    .from('inventory_ledger')
    .select('id, item_id, division_id, transaction_type, qty_change, valuation_rate, value_change, location_id, counterpart_location_id, spot_id, serial_id, lot_number, project_id, reason_code, reference_id, reference_type, notes, transacted_by, transacted_at, org_id, created_at')
    .eq('project_id', projectId)
    .order('transacted_at', { ascending: true });

  if (error) {
    logger.error('Failed to query job material cost', { error: error.message, projectId });
    throw new Error(`Job material cost query failed: ${error.message}`);
  }

  const entries = data ?? [];
  const totalCost = entries.reduce((sum, e) => sum + Number(e.value_change), 0);

  return {
    total_cost: Number(totalCost.toFixed(2)),
    entries,
  };
}

/**
 * Refreshes the materialized view concurrently.
 * This is a service-only operation (requires elevated privileges).
 */
export async function refreshStockSummary(supabase: SupabaseClient<Database>): Promise<void> {
  const { error } = await supabase.rpc('refresh_inventory_stock_summary' as never);

  if (error) {
    logger.error('Failed to refresh stock summary', { error: error.message });
    throw new Error(`Stock summary refresh failed: ${error.message}`);
  }
}

export { PROJECT_REQUIRED_TYPES, REASON_REQUIRED_TYPES };
export type { LedgerInsert, LedgerRow };
