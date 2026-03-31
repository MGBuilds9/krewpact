/**
 * Sync handler: KrewPact leave application -> ERPNext Leave Application
 */

import { createScopedServiceClient } from '@/lib/supabase/server';

import { mapLeaveApplicationToErp } from '../leave-application-mapper';
import { mockLeaveApplicationResponse } from '../mock-hr-responses';
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

export async function syncLeaveApplication(
  leaveId: string,
  _userId: string,
  jobContext?: SyncJobContext,
  erpCompany = 'KrewPact',
): Promise<SyncResult> {
  const supabase = createScopedServiceClient('erp-sync:leave-application');
  const job = await createSyncJob(supabase, 'leave_application', leaveId, jobContext);

  try {
    const { data: leave, error: leaveError } = await supabase
      .from('leave_applications')
      .select('*')
      .eq('id', leaveId)
      .single();

    if (leaveError || !leave) {
      return failJob(
        supabase,
        job,
        'leave_application',
        leaveId,
        `Leave application not found: ${leaveError?.message || 'null'}`,
      );
    }

    const record = leave as Record<string, unknown>;
    let erpDocname: string;

    if (isMockMode()) {
      const mockResp = mockLeaveApplicationResponse({
        id: leaveId,
        employee: record.employee as string,
        leave_type: record.leave_type as string,
        from_date: record.from_date as string,
        to_date: record.to_date as string,
      });
      erpDocname = mockResp.name;
    } else {
      const { ErpClient } = await import('../client');
      const client = new ErpClient();
      const mapped = mapLeaveApplicationToErp({
        id: leaveId,
        employee: record.employee as string,
        leave_type: record.leave_type as string,
        from_date: record.from_date as string,
        to_date: record.to_date as string,
        total_leave_days: (record.total_leave_days as number) || 1,
        reason: record.reason as string | null,
        status: (record.status as 'Open' | 'Approved' | 'Rejected' | 'Cancelled') || 'Open',
        company: (record.company as string) || erpCompany,
      });
      const result = await client.create<{ name: string }>('Leave Application', mapped);
      erpDocname = result.name;
    }

    await upsertSyncMap(
      supabase,
      'leave_application',
      leaveId,
      'Leave Application',
      erpDocname,
    );
    await logEvent(supabase, job.id, 'sync_completed', {
      entity_type: 'leave_application',
      entity_id: leaveId,
      erp_docname: erpDocname,
    });
    await updateJobStatus(supabase, job, 'succeeded');

    return {
      id: job.id,
      status: 'succeeded',
      entity_type: 'leave_application',
      entity_id: leaveId,
      erp_docname: erpDocname,
      attempt_count: job.attempt_count,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return failJob(supabase, job, 'leave_application', leaveId, message);
  }
}
