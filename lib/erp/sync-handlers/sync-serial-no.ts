/**
 * Sync handler: KrewPact serial number -> ERPNext Serial No
 */

import { createScopedServiceClient } from '@/lib/supabase/server';

import { mockSerialNoResponse } from '../mock-manufacturing-responses';
import { mapSerialNoToErp } from '../serial-no-mapper';
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

export async function syncSerialNo(
  serialNoId: string,
  _userId: string,
  jobContext?: SyncJobContext,
): Promise<SyncResult> {
  const supabase = createScopedServiceClient('erp-sync:serial-no');
  const job = await createSyncJob(supabase, 'serial_no', serialNoId, jobContext);

  try {
    const { data: sn, error: snError } = await supabase
      .from('serial_numbers')
      .select('*')
      .eq('id', serialNoId)
      .single();

    if (snError || !sn) {
      return failJob(
        supabase,
        job,
        'serial_no',
        serialNoId,
        `Serial number not found: ${snError?.message || 'null'}`,
      );
    }

    const record = sn as Record<string, unknown>;
    let erpDocname: string;

    if (isMockMode()) {
      const mockResp = mockSerialNoResponse({
        id: serialNoId,
        serial_no: record.serial_no as string,
        item_code: record.item_code as string,
      });
      erpDocname = mockResp.name;
    } else {
      const { ErpClient } = await import('../client');
      const client = new ErpClient();
      const mapped = mapSerialNoToErp({
        id: serialNoId,
        serial_no: record.serial_no as string,
        item_code: record.item_code as string,
        item_name: record.item_name as string,
        warehouse: record.warehouse as string | null,
        status: record.status as 'Active' | 'Inactive' | 'Delivered' | 'Expired',
        purchase_date: record.purchase_date as string | null,
        warranty_expiry_date: record.warranty_expiry_date as string | null,
        description: record.description as string | null,
      });
      const result = await client.create<{ name: string }>('Serial No', mapped);
      erpDocname = result.name;
    }

    await upsertSyncMap(supabase, 'serial_no', serialNoId, 'Serial No', erpDocname);
    await logEvent(supabase, job.id, 'sync_completed', {
      entity_type: 'serial_no',
      entity_id: serialNoId,
      erp_docname: erpDocname,
    });
    await updateJobStatus(supabase, job, 'succeeded');

    return {
      id: job.id,
      status: 'succeeded',
      entity_type: 'serial_no',
      entity_id: serialNoId,
      erp_docname: erpDocname,
      attempt_count: job.attempt_count,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return failJob(supabase, job, 'serial_no', serialNoId, message);
  }
}
