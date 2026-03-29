/**
 * Sync handler: KrewPact attendance -> ERPNext Attendance
 */

import { createScopedServiceClient } from '@/lib/supabase/server';

import { mapAttendanceToErp } from '../attendance-mapper';
import { mockAttendanceResponse } from '../mock-hr-responses';
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

export async function syncAttendance(
  attendanceId: string,
  _userId: string,
  jobContext?: SyncJobContext,
): Promise<SyncResult> {
  const supabase = createScopedServiceClient('erp-sync:attendance');
  const job = await createSyncJob(supabase, 'attendance', attendanceId, jobContext);

  try {
    const { data: att, error: attError } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('id', attendanceId)
      .single();

    if (attError || !att) {
      return failJob(
        supabase,
        job,
        'attendance',
        attendanceId,
        `Attendance not found: ${attError?.message || 'null'}`,
      );
    }

    const record = att as Record<string, unknown>;
    let erpDocname: string;

    if (isMockMode()) {
      const mockResp = mockAttendanceResponse({
        id: attendanceId,
        employee: record.employee as string,
        attendance_date: record.attendance_date as string,
        status: (record.status as string) || 'Present',
      });
      erpDocname = mockResp.name;
    } else {
      const { ErpClient } = await import('../client');
      const client = new ErpClient();
      const mapped = mapAttendanceToErp({
        id: attendanceId,
        employee: record.employee as string,
        attendance_date: record.attendance_date as string,
        status: (record.status as 'Present' | 'Absent' | 'Half Day' | 'On Leave' | 'Work From Home') || 'Present',
        leave_type: record.leave_type as string | null,
        company: (record.company as string) || 'MDM Group Inc.',
        shift: record.shift as string | null,
      });
      const result = await client.create<{ name: string }>('Attendance', mapped);
      erpDocname = result.name;
    }

    await upsertSyncMap(supabase, 'attendance', attendanceId, 'Attendance', erpDocname);
    await logEvent(supabase, job.id, 'sync_completed', {
      entity_type: 'attendance',
      entity_id: attendanceId,
      erp_docname: erpDocname,
    });
    await updateJobStatus(supabase, job, 'succeeded');

    return {
      id: job.id,
      status: 'succeeded',
      entity_type: 'attendance',
      entity_id: attendanceId,
      erp_docname: erpDocname,
      attempt_count: job.attempt_count,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return failJob(supabase, job, 'attendance', attendanceId, message);
  }
}
