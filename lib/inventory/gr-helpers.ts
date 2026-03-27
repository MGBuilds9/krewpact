/**
 * Goods receipt internal helpers — serial and lot record management.
 * These are implementation details of goods-receipts.ts.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

import { logger } from '@/lib/logger';
import type { Database } from '@/types/supabase';

export async function createSerialRecord(
  supabase: SupabaseClient<Database>,
  data: {
    item_id: string;
    division_id: string;
    serial_number: string;
    current_location_id: string;
    current_spot_id: string | null;
    acquisition_cost: number;
    condition_notes: string | null;
  },
): Promise<void> {
  const { error } = await supabase.from('inventory_serials').insert({
    item_id: data.item_id,
    division_id: data.division_id,
    serial_number: data.serial_number,
    current_location_id: data.current_location_id,
    current_spot_id: data.current_spot_id,
    acquisition_cost: data.acquisition_cost,
    condition_notes: data.condition_notes,
    status: 'in_stock',
  });

  if (error) {
    logger.error('Failed to create serial record', { error: error.message });
    throw new Error(`Serial insert failed: ${error.message}`);
  }
}

export async function upsertLotRecord(
  supabase: SupabaseClient<Database>,
  data: {
    item_id: string;
    division_id: string;
    lot_number: string;
    initial_qty: number;
  },
): Promise<void> {
  const { data: existing, error: queryError } = await supabase
    .from('inventory_lots')
    .select('id, initial_qty')
    .eq('item_id', data.item_id)
    .eq('lot_number', data.lot_number)
    .maybeSingle();

  if (queryError) {
    logger.error('Failed to query lot record', { error: queryError.message });
    throw new Error(`Lot query failed: ${queryError.message}`);
  }

  if (existing) {
    const newQty = (existing.initial_qty ?? 0) + data.initial_qty;
    const { error: updateError } = await supabase
      .from('inventory_lots')
      .update({ initial_qty: newQty })
      .eq('id', existing.id);

    if (updateError) {
      logger.error('Failed to update lot record', { error: updateError.message });
      throw new Error(`Lot update failed: ${updateError.message}`);
    }
  } else {
    const { error: insertError } = await supabase.from('inventory_lots').insert({
      item_id: data.item_id,
      division_id: data.division_id,
      lot_number: data.lot_number,
      initial_qty: data.initial_qty,
    });

    if (insertError) {
      logger.error('Failed to create lot record', { error: insertError.message });
      throw new Error(`Lot insert failed: ${insertError.message}`);
    }
  }
}
