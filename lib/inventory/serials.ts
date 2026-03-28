import type { SupabaseClient } from '@supabase/supabase-js';

import { createLedgerEntry } from '@/lib/inventory/ledger';
import { logger } from '@/lib/logger';
import type { Database } from '@/types/supabase';

type SerialRow = Database['public']['Tables']['inventory_serials']['Row'];
type SerialInsert = Database['public']['Tables']['inventory_serials']['Insert'];
type LedgerRow = Database['public']['Tables']['inventory_ledger']['Row'];

// Valid status transitions (non-checkout/return)
const STATUS_TRANSITIONS: Record<string, string[]> = {
  in_stock: ['maintenance', 'quarantine', 'decommissioned'],
  maintenance: ['in_stock', 'decommissioned'],
  quarantine: ['in_stock', 'decommissioned'],
};

/**
 * Creates a new serial-tracked item with status = 'in_stock'.
 */
export async function createSerial(
  supabase: SupabaseClient<Database>,
  data: SerialInsert,
): Promise<SerialRow> {
  const { data: serial, error } = await supabase
    .from('inventory_serials')
    .insert({ ...data, status: 'in_stock' })
    .select('id, item_id, division_id, serial_number, status, current_location_id, current_spot_id, checked_out_to, acquisition_cost, condition_notes, almyta_rec_id, org_id, purchase_date, secondary_serial, warranty_expiry, created_at, updated_at')
    .single();

  if (error) {
    logger.error('Failed to create serial', { error: error.message });
    throw new Error(`Serial insert failed: ${error.message}`);
  }

  return serial;
}

/**
 * Gets a serial by ID, including the related inventory item name/sku.
 */
export async function getSerial(
  supabase: SupabaseClient<Database>,
  id: string,
): Promise<SerialRow | null> {
  const { data, error } = await supabase
    .from('inventory_serials')
    .select('*, inventory_items(name, sku)')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    logger.error('Failed to get serial', { error: error.message, id });
    throw new Error(`Serial query failed: ${error.message}`);
  }

  return data;
}

/**
 * Paginated serial listing with filters.
 */
export async function listSerials(
  supabase: SupabaseClient<Database>,
  filters: {
    divisionId?: string;
    itemId?: string;
    status?: string;
    locationId?: string;
    checkedOutTo?: string;
    search?: string;
    limit?: number;
    offset?: number;
  },
): Promise<{ data: SerialRow[]; total: number }> {
  const limit = filters.limit ?? 50;
  const offset = filters.offset ?? 0;

  let query = supabase
    .from('inventory_serials')
    .select('*, inventory_items(name, sku)', { count: 'exact' });

  if (filters.divisionId) query = query.eq('division_id', filters.divisionId);
  if (filters.itemId) query = query.eq('item_id', filters.itemId);
  if (filters.status) query = query.eq('status', filters.status as SerialRow['status']);
  if (filters.locationId) query = query.eq('current_location_id', filters.locationId);
  if (filters.checkedOutTo) query = query.eq('checked_out_to', filters.checkedOutTo);
  if (filters.search) query = query.ilike('serial_number', `%${filters.search}%`);

  query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

  const { data, count, error } = await query;

  if (error) {
    logger.error('Failed to list serials', { error: error.message });
    throw new Error(`Serial list failed: ${error.message}`);
  }

  return { data: data ?? [], total: count ?? 0 };
}

/**
 * Checks out a serial-tracked item (tool/equipment).
 * Creates a tool_checkout ledger entry and updates serial status.
 */
export async function checkoutSerial(
  supabase: SupabaseClient<Database>,
  serialId: string,
  data: {
    checked_out_to: string;
    project_id?: string;
    notes?: string;
    transacted_by: string;
  },
): Promise<{ serial: SerialRow; ledgerEntry: LedgerRow }> {
  // 1. Read serial — must be in_stock
  const serial = await getSerial(supabase, serialId);
  if (!serial) throw new Error('Serial not found');
  if (serial.status === 'checked_out') throw new Error('Serial is already checked out');
  if (serial.status === 'decommissioned') throw new Error('Serial is decommissioned');
  if (serial.status !== 'in_stock')
    throw new Error(`Cannot checkout serial with status: ${serial.status}`);

  // 2. Create ledger entry
  const ledgerEntry = await createLedgerEntry(supabase, {
    item_id: serial.item_id,
    division_id: serial.division_id,
    transaction_type: 'tool_checkout',
    qty_change: -1,
    location_id: serial.current_location_id!,
    serial_id: serialId,
    project_id: data.project_id ?? null,
    notes: data.notes ?? null,
    transacted_by: data.transacted_by,
  });

  // 3. Update serial status
  const { data: updated, error } = await supabase
    .from('inventory_serials')
    .update({ status: 'checked_out', checked_out_to: data.checked_out_to })
    .eq('id', serialId)
    .select('id, item_id, division_id, serial_number, status, current_location_id, current_spot_id, checked_out_to, acquisition_cost, condition_notes, almyta_rec_id, org_id, purchase_date, secondary_serial, warranty_expiry, created_at, updated_at')
    .single();

  if (error) {
    logger.error('Ledger created but serial update failed', { error: error.message, serialId });
    throw new Error(`Serial update failed after ledger entry: ${error.message}`);
  }

  return { serial: updated, ledgerEntry };
}

/**
 * Returns a checked-out serial item back to stock.
 * Creates a tool_return ledger entry and updates serial status/location.
 */
export async function returnSerial(
  supabase: SupabaseClient<Database>,
  serialId: string,
  data: {
    return_location_id: string;
    return_spot_id?: string;
    condition_notes?: string;
    notes?: string;
    transacted_by: string;
  },
): Promise<{ serial: SerialRow; ledgerEntry: LedgerRow }> {
  // 1. Read serial — must be checked_out
  const serial = await getSerial(supabase, serialId);
  if (!serial) throw new Error('Serial not found');
  if (serial.status !== 'checked_out') throw new Error('Serial is not checked out');

  // 2. Create ledger entry
  const ledgerEntry = await createLedgerEntry(supabase, {
    item_id: serial.item_id,
    division_id: serial.division_id,
    transaction_type: 'tool_return',
    qty_change: 1,
    location_id: data.return_location_id,
    spot_id: data.return_spot_id ?? null,
    serial_id: serialId,
    notes: data.notes ?? null,
    transacted_by: data.transacted_by,
  });

  // 3. Update serial
  const updateData: Record<string, unknown> = {
    status: 'in_stock',
    checked_out_to: null,
    current_location_id: data.return_location_id,
    current_spot_id: data.return_spot_id ?? null,
  };
  if (data.condition_notes !== undefined) {
    updateData.condition_notes = data.condition_notes;
  }

  const { data: updated, error } = await supabase
    .from('inventory_serials')
    .update(updateData)
    .eq('id', serialId)
    .select('id, item_id, division_id, serial_number, status, current_location_id, current_spot_id, checked_out_to, acquisition_cost, condition_notes, almyta_rec_id, org_id, purchase_date, secondary_serial, warranty_expiry, created_at, updated_at')
    .single();

  if (error) {
    logger.error('Ledger created but serial update failed', { error: error.message, serialId });
    throw new Error(`Serial update failed after ledger entry: ${error.message}`);
  }

  return { serial: updated, ledgerEntry };
}

/**
 * Updates serial status for non-checkout/return transitions.
 */
export async function updateSerialStatus(
  supabase: SupabaseClient<Database>,
  id: string,
  status: 'maintenance' | 'quarantine' | 'decommissioned' | 'in_stock',
  notes?: string,
): Promise<SerialRow> {
  const serial = await getSerial(supabase, id);
  if (!serial) throw new Error('Serial not found');

  const allowed = STATUS_TRANSITIONS[serial.status];
  if (!allowed || !allowed.includes(status)) {
    throw new Error(`Cannot transition from ${serial.status} to ${status}`);
  }

  const updateData: Record<string, unknown> = { status };
  if (notes !== undefined) updateData.condition_notes = notes;

  const { data, error } = await supabase
    .from('inventory_serials')
    .update(updateData)
    .eq('id', id)
    .select('id, item_id, division_id, serial_number, status, current_location_id, current_spot_id, checked_out_to, acquisition_cost, condition_notes, almyta_rec_id, org_id, purchase_date, secondary_serial, warranty_expiry, created_at, updated_at')
    .single();

  if (error) {
    logger.error('Failed to update serial status', { error: error.message, id });
    throw new Error(`Serial status update failed: ${error.message}`);
  }

  return data;
}

/**
 * Returns ledger history for a serial, ordered by transacted_at DESC.
 */
export async function getSerialHistory(
  supabase: SupabaseClient<Database>,
  serialId: string,
): Promise<LedgerRow[]> {
  const { data, error } = await supabase
    .from('inventory_ledger')
    .select('id, item_id, division_id, transaction_type, qty_change, valuation_rate, value_change, location_id, counterpart_location_id, spot_id, serial_id, lot_number, project_id, reason_code, reference_id, reference_type, notes, transacted_by, transacted_at, org_id, created_at')
    .eq('serial_id', serialId)
    .order('transacted_at', { ascending: false });

  if (error) {
    logger.error('Failed to get serial history', { error: error.message, serialId });
    throw new Error(`Serial history query failed: ${error.message}`);
  }

  return data ?? [];
}
