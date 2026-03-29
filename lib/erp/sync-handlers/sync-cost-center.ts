/**
 * Sync handler: KrewPact cost center -> ERPNext Cost Center
 */

import { createScopedServiceClient } from '@/lib/supabase/server';

import { mapCostCenterToErp } from '../cost-center-mapper';
import { mockCostCenterCreateResponse } from '../mock-responses';
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

export async function syncCostCenter(
  costCenterId: string,
  _userId: string,
  jobContext?: SyncJobContext,
): Promise<SyncResult> {
  const supabase = createScopedServiceClient('erp-sync:cost-center');
  const job = await createSyncJob(supabase, 'cost_center', costCenterId, jobContext);

  try {
    const { data: cc, error: ccError } = await supabase
      .from('cost_centers')
      .select('*')
      .eq('id', costCenterId)
      .single();

    if (ccError || !cc) {
      return failJob(
        supabase,
        job,
        'cost_center',
        costCenterId,
        `Cost center not found: ${ccError?.message || 'null'}`,
      );
    }

    const record = cc as Record<string, unknown>;
    let erpDocname: string;

    if (isMockMode()) {
      const mockResp = mockCostCenterCreateResponse({
        id: costCenterId,
        cost_center_name: record.cost_center_name as string,
        company: (record.company as string) || 'MDM Group Inc.',
      });
      erpDocname = mockResp.name;
    } else {
      const { ErpClient } = await import('../client');
      const client = new ErpClient();
      const mapped = mapCostCenterToErp({
        id: costCenterId,
        cost_center_name: record.cost_center_name as string,
        parent_cost_center: record.parent_cost_center as string | null,
        company: (record.company as string) || 'MDM Group Inc.',
        is_group: record.is_group as boolean,
      });
      const result = await client.create<{ name: string }>('Cost Center', mapped);
      erpDocname = result.name;
    }

    await upsertSyncMap(supabase, 'cost_center', costCenterId, 'Cost Center', erpDocname);
    await logEvent(supabase, job.id, 'sync_completed', {
      entity_type: 'cost_center',
      entity_id: costCenterId,
      erp_docname: erpDocname,
    });
    await updateJobStatus(supabase, job, 'succeeded');

    return {
      id: job.id,
      status: 'succeeded',
      entity_type: 'cost_center',
      entity_id: costCenterId,
      erp_docname: erpDocname,
      attempt_count: job.attempt_count,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return failJob(supabase, job, 'cost_center', costCenterId, message);
  }
}
