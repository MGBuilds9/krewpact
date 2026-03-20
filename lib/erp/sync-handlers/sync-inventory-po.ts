/**
 * Sync handler: KrewPact inventory_purchase_orders -> ERPNext Purchase Order
 *
 * Triggered when a PO reaches `approved` status.
 *
 * Field mapping:
 *   po_number           -> ERPNext PO naming_series / title
 *   supplier_id         -> lookup portal_accounts -> erp_sync_map for ERPNext Supplier name
 *   order_date          -> transaction_date
 *   expected_delivery_date -> schedule_date (per item)
 *   notes               -> remarks
 *   PO lines            -> items[] (item_code from inventory_items.sku, qty, rate)
 */

import { logger } from '@/lib/logger';
import { createUserClient } from '@/lib/supabase/server';

import { mockPurchaseOrderResponse } from '../mock-responses';
import { isMockMode } from '../sync-service';
import {
  createSyncJob,
  failJob,
  logEvent,
  SyncResult,
  updateJobStatus,
  upsertSyncMap,
} from './sync-helpers';

/**
 * Look up the ERPNext Supplier name for a given portal_accounts.id
 * by checking the erp_sync_map table.
 */
async function resolveErpSupplierName(
  supabase: Awaited<ReturnType<typeof createUserClient>>,
  supplierId: string,
): Promise<string | null> {
  const { data: syncMapRow } = await supabase
    .from('erp_sync_map')
    .select('erp_docname')
    .eq('entity_type', 'supplier')
    .eq('local_id', supplierId)
    .maybeSingle();

  return (syncMapRow?.erp_docname as string) || null;
}

/**
 * Sync an approved KrewPact inventory purchase order to ERPNext as a Purchase Order.
 */
export async function syncInventoryPo(poId: string, _userId: string): Promise<SyncResult> {
  const supabase = await createUserClient();
  const job = await createSyncJob(supabase, 'inventory_purchase_order', poId);

  try {
    // 1. Fetch the PO header
    const { data: po, error: poError } = await supabase
      .from('inventory_purchase_orders')
      .select('*')
      .eq('id', poId)
      .single();

    if (poError || !po) {
      return failJob(
        supabase,
        job.id,
        'inventory_purchase_order',
        poId,
        `Purchase order not found: ${poError?.message || 'null'}`,
      );
    }

    const poRecord = po as Record<string, unknown>;

    // 2. Fetch PO lines with item SKU
    const { data: lines, error: linesError } = await supabase
      .from('inventory_po_lines')
      .select('*, inventory_items(sku, name)')
      .eq('po_id', poId)
      .order('line_number', { ascending: true });

    if (linesError) {
      return failJob(
        supabase,
        job.id,
        'inventory_purchase_order',
        poId,
        `Failed to fetch PO lines: ${linesError.message}`,
      );
    }

    // 3. Resolve ERPNext Supplier name
    const supplierId = poRecord.supplier_id as string;
    const erpSupplierName = await resolveErpSupplierName(supabase, supplierId);

    if (!erpSupplierName && !isMockMode()) {
      logger.warn('Supplier not yet synced to ERPNext', { supplierId, poId });
    }

    // 4. Build ERPNext Purchase Order payload
    const scheduleDate =
      (poRecord.expected_delivery_date as string) || (poRecord.order_date as string);

    const erpItems = (lines || []).map((line, idx) => {
      const lineRecord = line as Record<string, unknown>;
      const itemRelation = lineRecord.inventory_items as Record<string, unknown> | null;
      return {
        idx: idx + 1,
        item_code: itemRelation?.sku || `ITEM-${lineRecord.item_id as string}`,
        item_name: itemRelation?.name || (lineRecord.description as string),
        description: lineRecord.description as string,
        qty: lineRecord.qty_ordered as number,
        rate: lineRecord.unit_price as number,
        amount: lineRecord.line_total as number,
        schedule_date: scheduleDate,
      };
    });

    let erpDocname: string;

    if (isMockMode()) {
      const mockResp = mockPurchaseOrderResponse({
        id: poId,
        po_number: poRecord.po_number as string,
        supplier_name: erpSupplierName || 'MOCK-SUPPLIER',
        total_amount: poRecord.total_amount as number,
        items: erpItems,
      });
      erpDocname = mockResp.name;
    } else {
      const { ErpClient } = await import('../client');
      const client = new ErpClient();

      const payload: Record<string, unknown> = {
        naming_series: 'PUR-ORD-.YYYY.-',
        title: poRecord.po_number as string,
        supplier: erpSupplierName || '',
        transaction_date: poRecord.order_date as string,
        schedule_date: scheduleDate,
        currency: 'CAD',
        buying_price_list: 'Standard Buying',
        remarks: (poRecord.notes as string) || '',
        krewpact_id: poId,
        items: erpItems,
      };

      const result = await client.create<{ name: string }>('Purchase Order', payload);
      erpDocname = result.name;
    }

    await upsertSyncMap(supabase, 'inventory_purchase_order', poId, 'Purchase Order', erpDocname);
    await logEvent(supabase, job.id, 'sync_completed', {
      entity_type: 'inventory_purchase_order',
      entity_id: poId,
      erp_docname: erpDocname,
    });
    await updateJobStatus(supabase, job.id, 'succeeded');

    return {
      id: job.id,
      status: 'succeeded',
      entity_type: 'inventory_purchase_order',
      entity_id: poId,
      erp_docname: erpDocname,
      attempt_count: 1,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return failJob(supabase, job.id, 'inventory_purchase_order', poId, message);
  }
}
