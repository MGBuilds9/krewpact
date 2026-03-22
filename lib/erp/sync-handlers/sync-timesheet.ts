/**
 * Sync handler: KrewPact Timesheet Batch → ERPNext Timesheet
 */

import { createScopedServiceClient } from '@/lib/supabase/server';

import { mockTimesheetResponse } from '../mock-responses';
import { isMockMode } from '../sync-service';
import { mapTimesheetToErp } from '../timesheet-mapper';
import {
  createSyncJob,
  failJob,
  logEvent,
  type SyncJobContext,
  SyncResult,
  updateJobStatus,
  upsertSyncMap,
} from './sync-helpers';

export async function syncTimesheet(
  timesheetBatchId: string,
  _userId: string,
  jobContext?: SyncJobContext,
): Promise<SyncResult> {
  const supabase = createScopedServiceClient('erp-sync:timesheet');
  const job = await createSyncJob(supabase, 'timesheet', timesheetBatchId, jobContext);

  try {
    const { data: batch, error: batchError } = await supabase
      .from('timesheet_batches')
      .select('*, time_entries(*)')
      .eq('id', timesheetBatchId)
      .single();

    if (batchError || !batch) {
      return failJob(
        supabase,
        job,
        'timesheet',
        timesheetBatchId,
        `Timesheet batch not found: ${batchError?.message || 'null'}`,
      );
    }

    const b = batch as Record<string, unknown>;
    const rawEntries = b.time_entries;
    const entries = Array.isArray(rawEntries) ? rawEntries : rawEntries ? [rawEntries] : [];
    let erpDocname: string;

    if (isMockMode()) {
      const mockResp = mockTimesheetResponse({
        id: timesheetBatchId,
        total_hours: b.total_hours as number,
        period_start: b.period_start as string,
        period_end: b.period_end as string,
      });
      erpDocname = mockResp.name;
    } else {
      const { ErpClient } = await import('../client');
      const client = new ErpClient();
      const mapped = mapTimesheetToErp({
        id: timesheetBatchId,
        user_id: b.user_id as string,
        period_start: b.period_start as string,
        period_end: b.period_end as string,
        total_hours: b.total_hours as number,
        currency_code: b.currency_code as string | null,
        entries: entries.map((entry: Record<string, unknown>) => ({
          id: entry.id as string,
          project_id: entry.project_id as string | null,
          task_id: entry.task_id as string | null,
          description: entry.description as string | null,
          hours: entry.hours as number,
          entry_date: entry.entry_date as string,
        })),
      });
      const result = await client.create<{ name: string }>('Timesheet', mapped);
      erpDocname = result.name;
    }

    await upsertSyncMap(supabase, 'timesheet', timesheetBatchId, 'Timesheet', erpDocname);
    await logEvent(supabase, job.id, 'sync_completed', {
      entity_type: 'timesheet',
      entity_id: timesheetBatchId,
      erp_docname: erpDocname,
      entry_count: entries.length,
    });
    await updateJobStatus(supabase, job, 'succeeded');

    return {
      id: job.id,
      status: 'succeeded',
      entity_type: 'timesheet',
      entity_id: timesheetBatchId,
      erp_docname: erpDocname,
      attempt_count: job.attempt_count,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return failJob(supabase, job, 'timesheet', timesheetBatchId, message);
  }
}
