/**
 * Sync handler: KrewPact division -> ERPNext Department
 *
 * Department ↔ divisions mapping is critical for multi-division access.
 */

import { createScopedServiceClient } from '@/lib/supabase/server';

import { mapDepartmentToErp } from '../department-mapper';
import { mockDepartmentResponse } from '../mock-hr-responses';
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

export async function syncDepartment(
  divisionId: string,
  _userId: string,
  jobContext?: SyncJobContext,
): Promise<SyncResult> {
  const supabase = createScopedServiceClient('erp-sync:department');
  const job = await createSyncJob(supabase, 'department', divisionId, jobContext);

  try {
    const { data: div, error: divError } = await supabase
      .from('divisions')
      .select('*')
      .eq('id', divisionId)
      .single();

    if (divError || !div) {
      return failJob(
        supabase,
        job,
        'department',
        divisionId,
        `Department not found: ${divError?.message || 'null'}`,
      );
    }

    const record = div as Record<string, unknown>;
    let erpDocname: string;

    if (isMockMode()) {
      const mockResp = mockDepartmentResponse({
        id: divisionId,
        department_name: record.name as string,
        company: (record.company as string) || 'MDM Group Inc.',
      });
      erpDocname = mockResp.name;
    } else {
      const { ErpClient } = await import('../client');
      const client = new ErpClient();
      const mapped = mapDepartmentToErp({
        id: divisionId,
        department_name: record.name as string,
        company: (record.company as string) || 'MDM Group Inc.',
        parent_department: record.parent_department as string | null,
        is_group: (record.is_group as boolean) ?? false,
      });
      const result = await client.create<{ name: string }>('Department', mapped);
      erpDocname = result.name;
    }

    await upsertSyncMap(supabase, 'department', divisionId, 'Department', erpDocname);
    await logEvent(supabase, job.id, 'sync_completed', {
      entity_type: 'department',
      entity_id: divisionId,
      erp_docname: erpDocname,
    });
    await updateJobStatus(supabase, job, 'succeeded');

    return {
      id: job.id,
      status: 'succeeded',
      entity_type: 'department',
      entity_id: divisionId,
      erp_docname: erpDocname,
      attempt_count: job.attempt_count,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return failJob(supabase, job, 'department', divisionId, message);
  }
}
