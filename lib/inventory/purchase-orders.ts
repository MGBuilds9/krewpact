import type { SupabaseClient } from '@supabase/supabase-js';

import { logger } from '@/lib/logger';
import type { Database } from '@/types/supabase';

import { fetchPoForTransition, recalculatePoTotals, updatePoStatus } from './po-helpers';

type PORow = Database['public']['Tables']['inventory_purchase_orders']['Row'];
type POInsert = Database['public']['Tables']['inventory_purchase_orders']['Insert'];
type POLineRow = Database['public']['Tables']['inventory_po_lines']['Row'];
type POLineInsert = Database['public']['Tables']['inventory_po_lines']['Insert'];

type POWithLines = PORow & { inventory_po_lines: POLineRow[] };

// ============================================================
// PO Number Generation
// ============================================================

async function generatePoNumber(
  supabase: SupabaseClient<Database>,
  divisionId: string,
): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `PO-${year}-`;

  const { data, error } = await supabase
    .from('inventory_purchase_orders')
    .select('po_number')
    .eq('division_id', divisionId)
    .like('po_number', `${prefix}%`)
    .order('po_number', { ascending: false })
    .limit(1);

  if (error) {
    logger.error('Failed to query PO numbers for sequencing', { error: error.message });
    throw new Error(`PO number query failed: ${error.message}`);
  }

  let seq = 1;
  if (data && data.length > 0) {
    const lastNum = data[0].po_number;
    const lastSeq = parseInt(lastNum.replace(prefix, ''), 10);
    if (!isNaN(lastSeq)) {
      seq = lastSeq + 1;
    }
  }

  return `${prefix}${String(seq).padStart(4, '0')}`;
}

// ============================================================
// createPurchaseOrder
// ============================================================

export async function createPurchaseOrder(
  supabase: SupabaseClient<Database>,
  data: {
    division_id: string;
    supplier_id: string;
    project_id?: string;
    expected_delivery_date?: string;
    delivery_location_id?: string;
    notes?: string;
    rfq_bid_id?: string;
    created_by: string;
    lines: Array<{
      item_id: string;
      description: string;
      qty_ordered: number;
      unit_price: number;
      supplier_part_number?: string;
      notes?: string;
    }>;
  },
): Promise<PORow & { lines: POLineRow[] }> {
  const poNumber = await generatePoNumber(supabase, data.division_id);

  const subtotal = data.lines.reduce(
    (sum, l) => sum + Number((l.qty_ordered * l.unit_price).toFixed(2)),
    0,
  );
  const taxAmount = 0;
  const totalAmount = Number((subtotal + taxAmount).toFixed(2));

  const poInsert: POInsert = {
    po_number: poNumber,
    division_id: data.division_id,
    supplier_id: data.supplier_id,
    project_id: data.project_id ?? null,
    expected_delivery_date: data.expected_delivery_date ?? null,
    delivery_location_id: data.delivery_location_id ?? null,
    notes: data.notes ?? null,
    rfq_bid_id: data.rfq_bid_id ?? null,
    created_by: data.created_by,
    status: 'draft',
    subtotal,
    tax_amount: taxAmount,
    total_amount: totalAmount,
  };

  const { data: po, error: poError } = await supabase
    .from('inventory_purchase_orders')
    .insert(poInsert)
    .select()
    .single();

  if (poError || !po) {
    logger.error('Failed to create purchase order', { error: poError?.message });
    throw new Error(`PO insert failed: ${poError?.message}`);
  }

  const lineInserts: POLineInsert[] = data.lines.map((l, idx) => ({
    po_id: po.id,
    item_id: l.item_id,
    description: l.description,
    qty_ordered: l.qty_ordered,
    unit_price: l.unit_price,
    line_number: idx + 1,
    line_total: Number((l.qty_ordered * l.unit_price).toFixed(2)),
    supplier_part_number: l.supplier_part_number ?? null,
    notes: l.notes ?? null,
  }));

  const { data: lines, error: linesError } = await supabase
    .from('inventory_po_lines')
    .insert(lineInserts)
    .select();

  if (linesError || !lines) {
    logger.error('Failed to create PO lines', { error: linesError?.message });
    throw new Error(`PO lines insert failed: ${linesError?.message}`);
  }

  return { ...po, lines };
}

// ============================================================
// getPurchaseOrder
// ============================================================

export async function getPurchaseOrder(
  supabase: SupabaseClient<Database>,
  id: string,
): Promise<(PORow & { lines: POLineRow[] }) | null> {
  const { data, error } = await supabase
    .from('inventory_purchase_orders')
    .select('*, inventory_po_lines(*)')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    logger.error('Failed to get purchase order', { error: error.message, id });
    throw new Error(`PO query failed: ${error.message}`);
  }

  if (!data) return null;

  const typed = data as unknown as POWithLines;
  return { ...typed, lines: typed.inventory_po_lines };
}

// ============================================================
// listPurchaseOrders
// ============================================================

export async function listPurchaseOrders(
  supabase: SupabaseClient<Database>,
  filters: {
    divisionId?: string;
    status?: string;
    supplierId?: string;
    search?: string;
    limit?: number;
    offset?: number;
  },
): Promise<{ data: PORow[]; total: number }> {
  let query = supabase.from('inventory_purchase_orders').select('*', { count: 'exact' });

  if (filters.divisionId) query = query.eq('division_id', filters.divisionId);
  if (filters.status) query = query.eq('status', filters.status as PORow['status']);
  if (filters.supplierId) query = query.eq('supplier_id', filters.supplierId);
  if (filters.search) query = query.ilike('po_number', `%${filters.search}%`);

  const limit = filters.limit ?? 25;
  const offset = filters.offset ?? 0;
  query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    logger.error('Failed to list purchase orders', { error: error.message });
    throw new Error(`PO list failed: ${error.message}`);
  }

  return { data: data ?? [], total: count ?? 0 };
}

// ============================================================
// Status Transitions
// ============================================================

export async function submitPo(supabase: SupabaseClient<Database>, id: string): Promise<PORow> {
  const po = await fetchPoForTransition(supabase, id);

  if (po.status !== 'draft') {
    throw new Error(`Cannot submit PO in status "${po.status}". Must be "draft".`);
  }

  return updatePoStatus(supabase, id, 'submitted');
}

export async function approvePo(
  supabase: SupabaseClient<Database>,
  id: string,
  approvedBy: string,
): Promise<PORow> {
  const po = await fetchPoForTransition(supabase, id);

  if (po.status !== 'submitted') {
    throw new Error(`Cannot approve PO in status "${po.status}". Must be "submitted".`);
  }

  const { data, error } = await supabase
    .from('inventory_purchase_orders')
    .update({
      status: 'approved',
      approved_by: approvedBy,
      approved_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error || !data) {
    logger.error('Failed to approve PO', { error: error?.message, id });
    throw new Error(`PO approve failed: ${error?.message}`);
  }

  return data;
}

export async function cancelPo(supabase: SupabaseClient<Database>, id: string): Promise<PORow> {
  const po = await fetchPoForTransition(supabase, id);

  if (po.status !== 'draft' && po.status !== 'submitted') {
    throw new Error(`Cannot cancel PO in status "${po.status}". Must be "draft" or "submitted".`);
  }

  return updatePoStatus(supabase, id, 'cancelled');
}

// ============================================================
// Line Management
// ============================================================

export async function addPoLine(
  supabase: SupabaseClient<Database>,
  poId: string,
  line: {
    item_id: string;
    description: string;
    qty_ordered: number;
    unit_price: number;
    supplier_part_number?: string;
    notes?: string;
  },
): Promise<POLineRow> {
  // Get max line_number
  const { data: existingLines, error: queryError } = await supabase
    .from('inventory_po_lines')
    .select('line_number')
    .eq('po_id', poId)
    .order('line_number', { ascending: false })
    .limit(1);

  if (queryError) {
    logger.error('Failed to query PO lines for sequencing', { error: queryError.message });
    throw new Error(`PO line query failed: ${queryError.message}`);
  }

  const nextLineNumber =
    existingLines && existingLines.length > 0 ? existingLines[0].line_number + 1 : 1;

  const lineTotal = Number((line.qty_ordered * line.unit_price).toFixed(2));

  const { data: newLine, error: insertError } = await supabase
    .from('inventory_po_lines')
    .insert({
      po_id: poId,
      item_id: line.item_id,
      description: line.description,
      qty_ordered: line.qty_ordered,
      unit_price: line.unit_price,
      line_number: nextLineNumber,
      line_total: lineTotal,
      supplier_part_number: line.supplier_part_number ?? null,
      notes: line.notes ?? null,
    })
    .select()
    .single();

  if (insertError || !newLine) {
    logger.error('Failed to add PO line', { error: insertError?.message });
    throw new Error(`PO line insert failed: ${insertError?.message}`);
  }

  await recalculatePoTotals(supabase, poId);

  return newLine;
}

export async function removePoLine(
  supabase: SupabaseClient<Database>,
  lineId: string,
): Promise<void> {
  // Get the po_id before deleting
  const { data: line, error: queryError } = await supabase
    .from('inventory_po_lines')
    .select('po_id')
    .eq('id', lineId)
    .single();

  if (queryError || !line) {
    logger.error('Failed to find PO line for removal', { error: queryError?.message });
    throw new Error(`PO line not found: ${queryError?.message}`);
  }

  const { error: deleteError } = await supabase
    .from('inventory_po_lines')
    .delete()
    .eq('id', lineId);

  if (deleteError) {
    logger.error('Failed to delete PO line', { error: deleteError.message });
    throw new Error(`PO line delete failed: ${deleteError.message}`);
  }

  await recalculatePoTotals(supabase, line.po_id);
}

export { generatePoNumber };
