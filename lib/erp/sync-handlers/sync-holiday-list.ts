/**
 * Sync handler: KrewPact holiday list -> ERPNext Holiday List
 */

import { createScopedServiceClient } from '@/lib/supabase/server';

import { mapHolidayListToErp } from '../holiday-list-mapper';
import { mockHolidayListResponse } from '../mock-hr-responses';
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

export async function syncHolidayList(
  holidayListId: string,
  _userId: string,
  jobContext?: SyncJobContext,
): Promise<SyncResult> {
  const supabase = createScopedServiceClient('erp-sync:holiday-list');
  const job = await createSyncJob(supabase, 'holiday_list', holidayListId, jobContext);

  try {
    const { data: hl, error: hlError } = await supabase
      .from('holiday_lists')
      .select('*')
      .eq('id', holidayListId)
      .single();

    if (hlError || !hl) {
      return failJob(
        supabase,
        job,
        'holiday_list',
        holidayListId,
        `Holiday list not found: ${hlError?.message || 'null'}`,
      );
    }

    const record = hl as Record<string, unknown>;
    let erpDocname: string;

    if (isMockMode()) {
      const mockResp = mockHolidayListResponse({
        id: holidayListId,
        holiday_list_name: record.holiday_list_name as string,
        from_date: record.from_date as string,
        to_date: record.to_date as string,
      });
      erpDocname = mockResp.name;
    } else {
      const { ErpClient } = await import('../client');
      const client = new ErpClient();
      const mapped = mapHolidayListToErp({
        id: holidayListId,
        holiday_list_name: record.holiday_list_name as string,
        from_date: record.from_date as string,
        to_date: record.to_date as string,
        company: (record.company as string) || 'MDM Group Inc.',
        holidays: ((record.holidays as Record<string, unknown>[]) || []).map((h) => ({
          holiday_date: h.holiday_date as string,
          description: h.description as string,
        })),
      });
      const result = await client.create<{ name: string }>('Holiday List', mapped);
      erpDocname = result.name;
    }

    await upsertSyncMap(
      supabase,
      'holiday_list',
      holidayListId,
      'Holiday List',
      erpDocname,
    );
    await logEvent(supabase, job.id, 'sync_completed', {
      entity_type: 'holiday_list',
      entity_id: holidayListId,
      erp_docname: erpDocname,
    });
    await updateJobStatus(supabase, job, 'succeeded');

    return {
      id: job.id,
      status: 'succeeded',
      entity_type: 'holiday_list',
      entity_id: holidayListId,
      erp_docname: erpDocname,
      attempt_count: job.attempt_count,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return failJob(supabase, job, 'holiday_list', holidayListId, message);
  }
}
