/**
 * Sync handler: KrewPact BOM -> ERPNext BOM
 */

import { createScopedServiceClient } from '@/lib/supabase/server';

import { mapBomToErp } from '../bom-mapper';
import { mockBomResponse } from '../mock-manufacturing-responses';
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

export async function syncBom(
  bomId: string,
  _userId: string,
  jobContext?: SyncJobContext,
): Promise<SyncResult> {
  const supabase = createScopedServiceClient('erp-sync:bom');
  const job = await createSyncJob(supabase, 'bom', bomId, jobContext);

  try {
    const { data: bom, error: bomError } = await supabase
      .from('inventory_bom')
      .select('*')
      .eq('id', bomId)
      .single();

    if (bomError || !bom) {
      return failJob(supabase, job, 'bom', bomId, `BOM not found: ${bomError?.message || 'null'}`);
    }

    const record = bom as Record<string, unknown>;
    let erpDocname: string;

    if (isMockMode()) {
      const mockResp = mockBomResponse({
        id: bomId,
        item_code: record.item_code as string,
        item_name: record.item_name as string,
        quantity: (record.quantity as number) || 1,
      });
      erpDocname = mockResp.name;
    } else {
      const { ErpClient } = await import('../client');
      const client = new ErpClient();
      const mapped = mapBomToErp({
        id: bomId,
        item_code: record.item_code as string,
        item_name: record.item_name as string,
        quantity: (record.quantity as number) || 1,
        is_active: (record.is_active as boolean) ?? true,
        is_default: (record.is_default as boolean) ?? true,
        currency: (record.currency as string) || 'CAD',
        remarks: record.remarks as string | null,
        items: ((record.items as Record<string, unknown>[]) || []).map((item) => ({
          item_code: item.item_code as string,
          item_name: item.item_name as string,
          description: (item.description as string) || '',
          qty: item.qty as number,
          uom: (item.uom as string) || 'Nos',
          rate: item.rate as number,
          amount: item.amount as number,
          source_warehouse: item.source_warehouse as string | null,
        })),
      });
      const result = await client.create<{ name: string }>('BOM', mapped);
      erpDocname = result.name;
    }

    await upsertSyncMap(supabase, 'bom', bomId, 'BOM', erpDocname);
    await logEvent(supabase, job.id, 'sync_completed', {
      entity_type: 'bom',
      entity_id: bomId,
      erp_docname: erpDocname,
    });
    await updateJobStatus(supabase, job, 'succeeded');

    return {
      id: job.id,
      status: 'succeeded',
      entity_type: 'bom',
      entity_id: bomId,
      erp_docname: erpDocname,
      attempt_count: job.attempt_count,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return failJob(supabase, job, 'bom', bomId, message);
  }
}
