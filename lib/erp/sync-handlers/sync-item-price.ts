/**
 * Sync handler: KrewPact item price -> ERPNext Item Price
 */

import { createScopedServiceClient } from '@/lib/supabase/server';

import { mapItemPriceToErp } from '../item-price-mapper';
import { mockItemPriceResponse } from '../mock-manufacturing-responses';
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

export async function syncItemPrice(
  itemPriceId: string,
  _userId: string,
  jobContext?: SyncJobContext,
): Promise<SyncResult> {
  const supabase = createScopedServiceClient('erp-sync:item-price');
  const job = await createSyncJob(supabase, 'item_price', itemPriceId, jobContext);

  try {
    const { data: ip, error: ipError } = await supabase
      .from('item_prices')
      .select('*')
      .eq('id', itemPriceId)
      .single();

    if (ipError || !ip) {
      return failJob(
        supabase,
        job,
        'item_price',
        itemPriceId,
        `Item price not found: ${ipError?.message || 'null'}`,
      );
    }

    const record = ip as Record<string, unknown>;
    let erpDocname: string;

    if (isMockMode()) {
      const mockResp = mockItemPriceResponse({
        id: itemPriceId,
        item_code: record.item_code as string,
        price_list: record.price_list as string,
        price_list_rate: record.price_list_rate as number,
      });
      erpDocname = mockResp.name;
    } else {
      const { ErpClient } = await import('../client');
      const client = new ErpClient();
      const mapped = mapItemPriceToErp({
        id: itemPriceId,
        item_code: record.item_code as string,
        item_name: record.item_name as string,
        price_list: record.price_list as string,
        price_list_rate: record.price_list_rate as number,
        currency: (record.currency as string) || 'CAD',
        uom: record.uom as string | null,
        min_qty: (record.min_qty as number) || 0,
        valid_from: record.valid_from as string | null,
        valid_upto: record.valid_upto as string | null,
      });
      const result = await client.create<{ name: string }>('Item Price', mapped);
      erpDocname = result.name;
    }

    await upsertSyncMap(supabase, 'item_price', itemPriceId, 'Item Price', erpDocname);
    await logEvent(supabase, job.id, 'sync_completed', {
      entity_type: 'item_price',
      entity_id: itemPriceId,
      erp_docname: erpDocname,
    });
    await updateJobStatus(supabase, job, 'succeeded');

    return {
      id: job.id,
      status: 'succeeded',
      entity_type: 'item_price',
      entity_id: itemPriceId,
      erp_docname: erpDocname,
      attempt_count: job.attempt_count,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return failJob(supabase, job, 'item_price', itemPriceId, message);
  }
}
