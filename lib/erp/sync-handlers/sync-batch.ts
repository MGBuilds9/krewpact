/**
 * Sync handler: KrewPact batch -> ERPNext Batch
 */

import { createScopedServiceClient } from '@/lib/supabase/server';

import { mapBatchToErp } from '../batch-mapper';
import { mockBatchResponse } from '../mock-manufacturing-responses';
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

export async function syncBatch(
  batchId: string,
  _userId: string,
  jobContext?: SyncJobContext,
): Promise<SyncResult> {
  const supabase = createScopedServiceClient('erp-sync:batch');
  const job = await createSyncJob(supabase, 'batch', batchId, jobContext);

  try {
    const { data: batch, error: batchError } = await supabase
      .from('batches')
      .select('*')
      .eq('id', batchId)
      .single();

    if (batchError || !batch) {
      return failJob(
        supabase,
        job,
        'batch',
        batchId,
        `Batch not found: ${batchError?.message || 'null'}`,
      );
    }

    const record = batch as Record<string, unknown>;
    let erpDocname: string;

    if (isMockMode()) {
      const mockResp = mockBatchResponse({
        id: batchId,
        batch_id: record.batch_id as string,
        item_code: record.item_code as string,
      });
      erpDocname = mockResp.name;
    } else {
      const { ErpClient } = await import('../client');
      const client = new ErpClient();
      const mapped = mapBatchToErp({
        id: batchId,
        batch_id: record.batch_id as string,
        item_code: record.item_code as string,
        item_name: record.item_name as string,
        expiry_date: record.expiry_date as string | null,
        manufacturing_date: record.manufacturing_date as string | null,
        description: record.description as string | null,
      });
      const result = await client.create<{ name: string }>('Batch', mapped);
      erpDocname = result.name;
    }

    await upsertSyncMap(supabase, 'batch', batchId, 'Batch', erpDocname);
    await logEvent(supabase, job.id, 'sync_completed', {
      entity_type: 'batch',
      entity_id: batchId,
      erp_docname: erpDocname,
    });
    await updateJobStatus(supabase, job, 'succeeded');

    return {
      id: job.id,
      status: 'succeeded',
      entity_type: 'batch',
      entity_id: batchId,
      erp_docname: erpDocname,
      attempt_count: job.attempt_count,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return failJob(supabase, job, 'batch', batchId, message);
  }
}
