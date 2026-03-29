/**
 * Sync handler: KrewPact item -> ERPNext Item
 */

import { createScopedServiceClient } from '@/lib/supabase/server';

import { mapItemToErp } from '../item-mapper';
import { mockItemResponse } from '../mock-responses';
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

export async function syncItem(
  itemId: string,
  _userId: string,
  jobContext?: SyncJobContext,
): Promise<SyncResult> {
  const supabase = createScopedServiceClient('erp-sync:item');
  const job = await createSyncJob(supabase, 'item', itemId, jobContext);

  try {
    const { data: item, error: itemError } = await supabase
      .from('inventory_items')
      .select('*')
      .eq('id', itemId)
      .single();

    if (itemError || !item) {
      return failJob(
        supabase,
        job,
        'item',
        itemId,
        `Item not found: ${itemError?.message || 'null'}`,
      );
    }

    const record = item as Record<string, unknown>;
    let erpDocname: string;

    if (isMockMode()) {
      const mockResp = mockItemResponse({
        id: itemId,
        item_code: (record.sku as string) || itemId,
        item_name: record.name as string,
      });
      erpDocname = mockResp.name;
    } else {
      const { ErpClient } = await import('../client');
      const client = new ErpClient();
      const mapped = mapItemToErp({
        id: itemId,
        item_code: (record.sku as string) || itemId,
        item_name: record.name as string,
        item_group: (record.category as string) || 'All Item Groups',
        description: record.description as string | null,
        uom: (record.uom as string) || 'Nos',
        is_stock_item: true,
        is_purchase_item: true,
        is_sales_item: (record.is_sales_item as boolean) ?? false,
        default_warehouse: record.default_warehouse as string | null,
      });
      const result = await client.create<{ name: string }>('Item', mapped);
      erpDocname = result.name;
    }

    await upsertSyncMap(supabase, 'item', itemId, 'Item', erpDocname);
    await logEvent(supabase, job.id, 'sync_completed', {
      entity_type: 'item',
      entity_id: itemId,
      erp_docname: erpDocname,
    });
    await updateJobStatus(supabase, job, 'succeeded');

    return {
      id: job.id,
      status: 'succeeded',
      entity_type: 'item',
      entity_id: itemId,
      erp_docname: erpDocname,
      attempt_count: job.attempt_count,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return failJob(supabase, job, 'item', itemId, message);
  }
}
