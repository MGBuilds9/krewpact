/**
 * Sync handler: KrewPact UOM -> ERPNext UOM
 * Reference data — low-frequency sync.
 */

import { createScopedServiceClient } from '@/lib/supabase/server';

import { mockUomResponse } from '../mock-manufacturing-responses';
import { isMockMode } from '../sync-service';
import { mapUomToErp } from '../uom-mapper';
import {
  createSyncJob,
  failJob,
  logEvent,
  type SyncJobContext,
  SyncResult,
  updateJobStatus,
  upsertSyncMap,
} from './sync-helpers';

export async function syncUom(
  uomId: string,
  _userId: string,
  jobContext?: SyncJobContext,
): Promise<SyncResult> {
  const supabase = createScopedServiceClient('erp-sync:uom');
  const job = await createSyncJob(supabase, 'uom', uomId, jobContext);

  try {
    const { data: uom, error: uomError } = await supabase
      .from('units_of_measure')
      .select('*')
      .eq('id', uomId)
      .single();

    if (uomError || !uom) {
      return failJob(
        supabase,
        job,
        'uom',
        uomId,
        `UOM not found: ${uomError?.message || 'null'}`,
      );
    }

    const record = uom as Record<string, unknown>;
    let erpDocname: string;

    if (isMockMode()) {
      const mockResp = mockUomResponse({
        id: uomId,
        uom_name: record.uom_name as string,
      });
      erpDocname = mockResp.name;
    } else {
      const { ErpClient } = await import('../client');
      const client = new ErpClient();
      const mapped = mapUomToErp({
        id: uomId,
        uom_name: record.uom_name as string,
        must_be_whole_number: (record.must_be_whole_number as boolean) ?? false,
      });
      const result = await client.create<{ name: string }>('UOM', mapped);
      erpDocname = result.name;
    }

    await upsertSyncMap(supabase, 'uom', uomId, 'UOM', erpDocname);
    await logEvent(supabase, job.id, 'sync_completed', {
      entity_type: 'uom',
      entity_id: uomId,
      erp_docname: erpDocname,
    });
    await updateJobStatus(supabase, job, 'succeeded');

    return {
      id: job.id,
      status: 'succeeded',
      entity_type: 'uom',
      entity_id: uomId,
      erp_docname: erpDocname,
      attempt_count: job.attempt_count,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return failJob(supabase, job, 'uom', uomId, message);
  }
}
