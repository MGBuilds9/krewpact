import type { SupabaseClient } from '@supabase/supabase-js';

import { createLedgerEntry } from '@/lib/inventory/ledger';
import { logger } from '@/lib/logger';
import type { Database } from '@/types/supabase';

import { createSerialRecord, upsertLotRecord } from './gr-helpers';

type GRRow = Database['public']['Tables']['inventory_goods_receipts']['Row'];
type GRInsert = Database['public']['Tables']['inventory_goods_receipts']['Insert'];
type GRLineRow = Database['public']['Tables']['inventory_gr_lines']['Row'];
type GRLineInsert = Database['public']['Tables']['inventory_gr_lines']['Insert'];
type POLineRow = Database['public']['Tables']['inventory_po_lines']['Row'];

type GRWithLines = GRRow & { inventory_gr_lines: GRLineRow[] };

// ============================================================
// GR Number Generation
// ============================================================

async function generateGrNumber(
  supabase: SupabaseClient<Database>,
  divisionId: string,
): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `GR-${year}-`;

  const { data, error } = await supabase
    .from('inventory_goods_receipts')
    .select('gr_number')
    .eq('division_id', divisionId)
    .like('gr_number', `${prefix}%`)
    .order('gr_number', { ascending: false })
    .limit(1);

  if (error) {
    logger.error('Failed to query GR numbers for sequencing', { error: error.message });
    throw new Error(`GR number query failed: ${error.message}`);
  }

  let seq = 1;
  if (data && data.length > 0) {
    const lastNum = data[0].gr_number;
    const lastSeq = parseInt(lastNum.replace(prefix, ''), 10);
    if (!isNaN(lastSeq)) {
      seq = lastSeq + 1;
    }
  }

  return `${prefix}${String(seq).padStart(4, '0')}`;
}

// ============================================================
// createGoodsReceipt
// ============================================================

export async function createGoodsReceipt(
  supabase: SupabaseClient<Database>,
  data: {
    po_id: string;
    division_id: string;
    location_id: string;
    received_by: string;
    created_by: string;
    received_date?: string;
    notes?: string;
    lines: Array<{
      po_line_id: string;
      item_id: string;
      qty_received: number;
      unit_price: number;
      spot_id?: string;
      serial_number?: string;
      lot_number?: string;
      condition_notes?: string;
    }>;
  },
): Promise<GRRow & { lines: GRLineRow[] }> {
  const grNumber = await generateGrNumber(supabase, data.division_id);

  const grInsert: GRInsert = {
    gr_number: grNumber,
    po_id: data.po_id,
    division_id: data.division_id,
    location_id: data.location_id,
    received_by: data.received_by,
    created_by: data.created_by,
    received_date: data.received_date ?? new Date().toISOString().split('T')[0],
    notes: data.notes ?? null,
    status: 'draft',
  };

  const { data: gr, error: grError } = await supabase
    .from('inventory_goods_receipts')
    .insert(grInsert)
    .select('id, gr_number, po_id, division_id, location_id, received_by, created_by, received_date, notes, status, org_id, created_at, updated_at')
    .single();

  if (grError || !gr) {
    logger.error('Failed to create goods receipt', { error: grError?.message });
    throw new Error(`GR insert failed: ${grError?.message}`);
  }

  const lineInserts: GRLineInsert[] = data.lines.map((l) => ({
    gr_id: gr.id,
    po_line_id: l.po_line_id,
    item_id: l.item_id,
    qty_received: l.qty_received,
    unit_price: l.unit_price,
    spot_id: l.spot_id ?? null,
    serial_number: l.serial_number ?? null,
    lot_number: l.lot_number ?? null,
    condition_notes: l.condition_notes ?? null,
  }));

  const { data: lines, error: linesError } = await supabase
    .from('inventory_gr_lines')
    .insert(lineInserts)
    .select('id, gr_id, po_line_id, item_id, qty_received, unit_price, spot_id, serial_number, lot_number, condition_notes, created_at');

  if (linesError || !lines) {
    logger.error('Failed to create GR lines', { error: linesError?.message });
    throw new Error(`GR lines insert failed: ${linesError?.message}`);
  }

  return { ...gr, lines };
}

// ============================================================
// confirmGoodsReceipt helpers
// ============================================================

async function fetchAndValidatePoLines(
  supabase: SupabaseClient<Database>,
  gr: GRRow & { lines: GRLineRow[] },
): Promise<Map<string, POLineRow>> {
  const poLineIds = gr.lines.map((l) => l.po_line_id);
  const { data: poLines, error: poLinesError } = await supabase
    .from('inventory_po_lines')
    .select('*')
    .in('id', poLineIds);

  if (poLinesError || !poLines) {
    logger.error('Failed to fetch PO lines for validation', { error: poLinesError?.message });
    throw new Error(`PO lines query failed: ${poLinesError?.message}`);
  }

  const poLineMap = new Map<string, POLineRow>();
  for (const pl of poLines) poLineMap.set(pl.id, pl);

  for (const grLine of gr.lines) {
    const poLine = poLineMap.get(grLine.po_line_id);
    if (!poLine) throw new Error(`PO line ${grLine.po_line_id} not found`);
    const remainingQty = poLine.qty_ordered - poLine.qty_received;
    if (grLine.qty_received > remainingQty) {
      throw new Error(
        `Over-receiving on PO line ${poLine.id}: ` +
          `ordered=${poLine.qty_ordered}, already received=${poLine.qty_received}, ` +
          `trying to receive=${grLine.qty_received}, remaining=${remainingQty}`,
      );
    }
  }

  return poLineMap;
}

async function applyGrLineWrites(
  supabase: SupabaseClient<Database>,
  gr: GRRow & { lines: GRLineRow[] },
  poLineMap: Map<string, POLineRow>,
  transactedBy: string,
): Promise<void> {
  for (const grLine of gr.lines) {
    await createLedgerEntry(supabase, {
      item_id: grLine.item_id,
      division_id: gr.division_id,
      transaction_type: 'purchase_receipt',
      qty_change: grLine.qty_received,
      location_id: gr.location_id,
      valuation_rate: grLine.unit_price,
      spot_id: grLine.spot_id ?? null,
      lot_number: grLine.lot_number ?? null,
      notes: `GR ${gr.gr_number}`,
      transacted_by: transactedBy,
    });
  }

  for (const grLine of gr.lines) {
    const poLine = poLineMap.get(grLine.po_line_id)!;
    const { error: updateError } = await supabase
      .from('inventory_po_lines')
      .update({ qty_received: poLine.qty_received + grLine.qty_received })
      .eq('id', grLine.po_line_id);

    if (updateError) {
      logger.error('Failed to update PO line qty_received', {
        error: updateError.message,
        poLineId: grLine.po_line_id,
      });
      throw new Error(`PO line update failed: ${updateError.message}`);
    }

    if (grLine.serial_number) {
      await createSerialRecord(supabase, {
        item_id: grLine.item_id,
        division_id: gr.division_id,
        serial_number: grLine.serial_number,
        current_location_id: gr.location_id,
        current_spot_id: grLine.spot_id ?? null,
        acquisition_cost: grLine.unit_price,
        condition_notes: grLine.condition_notes ?? null,
      });
    }

    if (grLine.lot_number) {
      await upsertLotRecord(supabase, {
        item_id: grLine.item_id,
        division_id: gr.division_id,
        lot_number: grLine.lot_number,
        initial_qty: grLine.qty_received,
      });
    }
  }
}

async function updatePoStatus(supabase: SupabaseClient<Database>, poId: string): Promise<void> {
  const { data: updatedPoLines, error: refetchError } = await supabase
    .from('inventory_po_lines')
    .select('qty_ordered, qty_received')
    .eq('po_id', poId);

  if (refetchError || !updatedPoLines) {
    logger.error('Failed to refetch PO lines for status check', { error: refetchError?.message });
    throw new Error(`PO lines refetch failed: ${refetchError?.message}`);
  }

  const fullyReceived = updatedPoLines.every((l) => l.qty_received >= l.qty_ordered);
  const { error: poStatusError } = await supabase
    .from('inventory_purchase_orders')
    .update({ status: fullyReceived ? 'fully_received' : 'partially_received' })
    .eq('id', poId);

  if (poStatusError) {
    logger.error('Failed to update PO status after GR confirm', { error: poStatusError.message });
    throw new Error(`PO status update failed: ${poStatusError.message}`);
  }
}

// ============================================================
// confirmGoodsReceipt
// ============================================================

export async function confirmGoodsReceipt(
  supabase: SupabaseClient<Database>,
  grId: string,
  transactedBy: string,
): Promise<GRRow> {
  const gr = await getGoodsReceipt(supabase, grId);
  if (!gr) throw new Error('Goods receipt not found');
  if (gr.status !== 'draft') {
    throw new Error(`Cannot confirm GR in status "${gr.status}". Must be "draft".`);
  }

  const poLineMap = await fetchAndValidatePoLines(supabase, gr);
  await applyGrLineWrites(supabase, gr, poLineMap, transactedBy);
  await updatePoStatus(supabase, gr.po_id);

  const { data: confirmedGr, error: confirmError } = await supabase
    .from('inventory_goods_receipts')
    .update({ status: 'confirmed' })
    .eq('id', grId)
    .select('id, gr_number, po_id, division_id, location_id, received_by, created_by, received_date, notes, status, org_id, created_at, updated_at')
    .single();

  if (confirmError || !confirmedGr) {
    logger.error('Failed to confirm goods receipt', { error: confirmError?.message });
    throw new Error(`GR confirm failed: ${confirmError?.message}`);
  }

  return confirmedGr;
}

// ============================================================
// getGoodsReceipt
// ============================================================

export async function getGoodsReceipt(
  supabase: SupabaseClient<Database>,
  id: string,
): Promise<(GRRow & { lines: GRLineRow[] }) | null> {
  const { data, error } = await supabase
    .from('inventory_goods_receipts')
    .select('*, inventory_gr_lines(*)')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    logger.error('Failed to get goods receipt', { error: error.message, id });
    throw new Error(`GR query failed: ${error.message}`);
  }

  if (!data) return null;

  const typed = data as unknown as GRWithLines;
  return { ...typed, lines: typed.inventory_gr_lines };
}

// ============================================================
// listGoodsReceipts
// ============================================================

export async function listGoodsReceipts(
  supabase: SupabaseClient<Database>,
  filters: {
    poId?: string;
    divisionId?: string;
    status?: string;
    limit?: number;
    offset?: number;
  },
): Promise<{ data: GRRow[]; total: number }> {
  let query = supabase.from('inventory_goods_receipts').select('*', { count: 'exact' });

  if (filters.poId) query = query.eq('po_id', filters.poId);
  if (filters.divisionId) query = query.eq('division_id', filters.divisionId);
  if (filters.status) query = query.eq('status', filters.status as GRRow['status']);

  const limit = filters.limit ?? 25;
  const offset = filters.offset ?? 0;
  query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    logger.error('Failed to list goods receipts', { error: error.message });
    throw new Error(`GR list failed: ${error.message}`);
  }

  return { data: data ?? [], total: count ?? 0 };
}

export { generateGrNumber };
