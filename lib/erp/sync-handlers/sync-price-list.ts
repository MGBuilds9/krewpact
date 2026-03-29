/**
 * Sync handler: KrewPact price list -> ERPNext Price List
 */

import { createScopedServiceClient } from '@/lib/supabase/server';

import { mockPriceListResponse } from '../mock-manufacturing-responses';
import { mapPriceListToErp } from '../price-list-mapper';
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

export async function syncPriceList(
  priceListId: string,
  _userId: string,
  jobContext?: SyncJobContext,
): Promise<SyncResult> {
  const supabase = createScopedServiceClient('erp-sync:price-list');
  const job = await createSyncJob(supabase, 'price_list', priceListId, jobContext);

  try {
    const { data: pl, error: plError } = await supabase
      .from('price_lists')
      .select('*')
      .eq('id', priceListId)
      .single();

    if (plError || !pl) {
      return failJob(
        supabase,
        job,
        'price_list',
        priceListId,
        `Price list not found: ${plError?.message || 'null'}`,
      );
    }

    const record = pl as Record<string, unknown>;
    let erpDocname: string;

    if (isMockMode()) {
      const mockResp = mockPriceListResponse({
        id: priceListId,
        price_list_name: record.price_list_name as string,
      });
      erpDocname = mockResp.name;
    } else {
      const { ErpClient } = await import('../client');
      const client = new ErpClient();
      const mapped = mapPriceListToErp({
        id: priceListId,
        price_list_name: record.price_list_name as string,
        currency: (record.currency as string) || 'CAD',
        buying: (record.buying as boolean) ?? true,
        selling: (record.selling as boolean) ?? false,
        enabled: (record.enabled as boolean) ?? true,
      });
      const result = await client.create<{ name: string }>('Price List', mapped);
      erpDocname = result.name;
    }

    await upsertSyncMap(
      supabase,
      'price_list',
      priceListId,
      'Price List',
      erpDocname,
    );
    await logEvent(supabase, job.id, 'sync_completed', {
      entity_type: 'price_list',
      entity_id: priceListId,
      erp_docname: erpDocname,
    });
    await updateJobStatus(supabase, job, 'succeeded');

    return {
      id: job.id,
      status: 'succeeded',
      entity_type: 'price_list',
      entity_id: priceListId,
      erp_docname: erpDocname,
      attempt_count: job.attempt_count,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return failJob(supabase, job, 'price_list', priceListId, message);
  }
}
