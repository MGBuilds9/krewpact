/**
 * Sync handler: KrewPact inventory_goods_receipts -> ERPNext Purchase Receipt
 *
 * Triggered when a goods receipt is confirmed (status = 'confirmed').
 *
 * Field mapping:
 *   gr_number       -> ERPNext Purchase Receipt title
 *   po_id           -> lookup erp_sync_map for the synced ERPNext Purchase Order name
 *   received_date   -> posting_date
 *   location_id     -> warehouse (mapped via inventory_locations.name)
 *   GR lines        -> items[] (item_code from inventory_items.sku, qty, rate)
 */

import { logger } from '@/lib/logger';
import { createScopedServiceClient } from '@/lib/supabase/server';

import { mockPurchaseReceiptResponse } from '../mock-responses';
import { isMockMode } from '../sync-service';
import {
  createSyncJob,
  failJob,
  logEvent,
  type SyncJobContext,
  SyncResult,
  updateJobStatus,
  upsertSyncMap,
} from './sync-helpers';

/**
 * Look up the ERPNext Purchase Order name for a given inventory_purchase_orders.id.
 */
async function resolveErpPurchaseOrderName(
  supabase: ReturnType<typeof createScopedServiceClient>,
  poId: string,
): Promise<string | null> {
  const { data: syncMapRow } = await supabase
    .from('erp_sync_map')
    .select('erp_docname')
    .eq('entity_type', 'inventory_purchase_order')
    .eq('local_id', poId)
    .maybeSingle();

  return (syncMapRow?.erp_docname as string) || null;
}

/**
 * Sync a confirmed KrewPact goods receipt to ERPNext as a Purchase Receipt.
 */
export async function syncGoodsReceipt(
  grId: string,
  _userId: string,
  jobContext?: SyncJobContext,
): Promise<SyncResult> {
  const supabase = createScopedServiceClient('erp-sync:goods-receipt');
  const job = await createSyncJob(supabase, 'inventory_goods_receipt', grId, jobContext);

  try {
    // 1. Fetch the GR header
    const { data: gr, error: grError } = await supabase
      .from('inventory_goods_receipts')
      .select('*')
      .eq('id', grId)
      .single();

    if (grError || !gr) {
      return failJob(
        supabase,
        job,
        'inventory_goods_receipt',
        grId,
        `Goods receipt not found: ${grError?.message || 'null'}`,
      );
    }

    const grRecord = gr as Record<string, unknown>;

    // 2. Fetch GR lines with item details
    const { data: lines, error: linesError } = await supabase
      .from('inventory_gr_lines')
      .select('*, inventory_items(sku, name)')
      .eq('gr_id', grId);

    if (linesError) {
      return failJob(
        supabase,
        job,
        'inventory_goods_receipt',
        grId,
        `Failed to fetch GR lines: ${linesError.message}`,
      );
    }

    // 3. Resolve the ERPNext Purchase Order name for the linked PO
    const poId = grRecord.po_id as string;
    const erpPoName = await resolveErpPurchaseOrderName(supabase, poId);

    if (!erpPoName && !isMockMode()) {
      logger.warn('Linked PO not yet synced to ERPNext', { poId, grId });
    }

    // 4. Resolve warehouse name from inventory_locations
    const { data: location } = await supabase
      .from('inventory_locations')
      .select('name')
      .eq('id', grRecord.location_id as string)
      .maybeSingle();

    const warehouseName = (location?.name as string) || 'Stores - MDM';

    // 5. Build ERPNext Purchase Receipt payload
    const erpItems = (lines || []).map((line, idx) => {
      const lineRecord = line as Record<string, unknown>;
      const itemRelation = lineRecord.inventory_items as Record<string, unknown> | null;
      return {
        idx: idx + 1,
        item_code: itemRelation?.sku || `ITEM-${lineRecord.item_id as string}`,
        item_name: itemRelation?.name || '',
        qty: lineRecord.qty_received as number,
        rate: lineRecord.unit_price as number,
        warehouse: warehouseName,
        purchase_order: erpPoName || '',
        serial_no: (lineRecord.serial_number as string) || '',
        batch_no: (lineRecord.lot_number as string) || '',
      };
    });

    let erpDocname: string;

    if (isMockMode()) {
      const mockResp = mockPurchaseReceiptResponse({
        id: grId,
        gr_number: grRecord.gr_number as string,
        po_name: erpPoName || 'MOCK-PO',
        items: erpItems,
      });
      erpDocname = mockResp.name;
    } else {
      const { ErpClient } = await import('../client');
      const client = new ErpClient();

      const payload: Record<string, unknown> = {
        naming_series: 'MAT-PRE-.YYYY.-',
        title: grRecord.gr_number as string,
        posting_date: grRecord.received_date as string,
        supplier: '', // Will be populated from PO link by ERPNext
        currency: 'CAD',
        krewpact_id: grId,
        items: erpItems,
      };

      // If we have the linked PO, ERPNext can auto-fill supplier
      if (erpPoName) {
        payload.purchase_order = erpPoName;
      }

      const result = await client.create<{ name: string }>('Purchase Receipt', payload);
      erpDocname = result.name;
    }

    await upsertSyncMap(supabase, 'inventory_goods_receipt', grId, 'Purchase Receipt', erpDocname);
    await logEvent(supabase, job.id, 'sync_completed', {
      entity_type: 'inventory_goods_receipt',
      entity_id: grId,
      erp_docname: erpDocname,
    });
    await updateJobStatus(supabase, job, 'succeeded');

    return {
      id: job.id,
      status: 'succeeded',
      entity_type: 'inventory_goods_receipt',
      entity_id: grId,
      erp_docname: erpDocname,
      attempt_count: job.attempt_count,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return failJob(supabase, job, 'inventory_goods_receipt', grId, message);
  }
}
