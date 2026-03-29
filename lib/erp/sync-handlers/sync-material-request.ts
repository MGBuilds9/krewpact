/**
 * Sync handler: KrewPact material request -> ERPNext Material Request
 */

import { createScopedServiceClient } from '@/lib/supabase/server';

import { mapMaterialRequestToErp } from '../material-request-mapper';
import { mockMaterialRequestResponse } from '../mock-responses';
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

 
export async function syncMaterialRequest(
  mrId: string,
  _userId: string,
  jobContext?: SyncJobContext,
): Promise<SyncResult> {
  const supabase = createScopedServiceClient('erp-sync:material-request');
  const job = await createSyncJob(supabase, 'material_request', mrId, jobContext);

  try {
    const { data: mr, error: mrError } = await supabase
      .from('material_requests')
      .select('*')
      .eq('id', mrId)
      .single();

    if (mrError || !mr) {
      return failJob(
        supabase,
        job,
        'material_request',
        mrId,
        `Material request not found: ${mrError?.message || 'null'}`,
      );
    }

    const record = mr as Record<string, unknown>;
    let erpDocname: string;

    if (isMockMode()) {
      const mockResp = mockMaterialRequestResponse({
        id: mrId,
        request_number: record.request_number as string,
        request_type: record.request_type as string,
      });
      erpDocname = mockResp.name;
    } else {
      const { ErpClient } = await import('../client');
      const client = new ErpClient();
      const mapped = mapMaterialRequestToErp({
        id: mrId,
        request_number: record.request_number as string,
        request_type: record.request_type as 'Purchase' | 'Material Transfer' | 'Material Issue',
        transaction_date: record.transaction_date as string,
        required_by_date: record.required_by_date as string | null,
        project_name: record.project_name as string | null,
        items: ((record.items as Record<string, unknown>[]) || []).map((item) => ({
          item_code: item.item_code as string,
          item_name: item.item_name as string,
          description: item.description as string,
          qty: item.qty as number,
          uom: (item.uom as string) || 'Nos',
          warehouse: item.warehouse as string | null,
        })),
      });
      const result = await client.create<{ name: string }>('Material Request', mapped);
      erpDocname = result.name;
    }

    await upsertSyncMap(supabase, 'material_request', mrId, 'Material Request', erpDocname);
    await logEvent(supabase, job.id, 'sync_completed', {
      entity_type: 'material_request',
      entity_id: mrId,
      erp_docname: erpDocname,
    });
    await updateJobStatus(supabase, job, 'succeeded');

    return {
      id: job.id,
      status: 'succeeded',
      entity_type: 'material_request',
      entity_id: mrId,
      erp_docname: erpDocname,
      attempt_count: job.attempt_count,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return failJob(supabase, job, 'material_request', mrId, message);
  }
}
