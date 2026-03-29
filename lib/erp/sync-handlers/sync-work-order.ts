/**
 * Sync handler: KrewPact work order -> ERPNext Work Order
 */

import { createScopedServiceClient } from '@/lib/supabase/server';

import { mockWorkOrderResponse } from '../mock-manufacturing-responses';
import { isMockMode } from '../sync-service';
import { mapWorkOrderToErp } from '../work-order-mapper';
import {
  createSyncJob,
  failJob,
  logEvent,
  type SyncJobContext,
  SyncResult,
  updateJobStatus,
  upsertSyncMap,
} from './sync-helpers';

export async function syncWorkOrder(
  workOrderId: string,
  _userId: string,
  jobContext?: SyncJobContext,
): Promise<SyncResult> {
  const supabase = createScopedServiceClient('erp-sync:work-order');
  const job = await createSyncJob(supabase, 'work_order', workOrderId, jobContext);

  try {
    const { data: wo, error: woError } = await supabase
      .from('work_orders')
      .select('*')
      .eq('id', workOrderId)
      .single();

    if (woError || !wo) {
      return failJob(
        supabase,
        job,
        'work_order',
        workOrderId,
        `Work order not found: ${woError?.message || 'null'}`,
      );
    }

    const record = wo as Record<string, unknown>;
    let erpDocname: string;

    if (isMockMode()) {
      const mockResp = mockWorkOrderResponse({
        id: workOrderId,
        production_item: record.production_item as string,
        qty: record.qty as number,
      });
      erpDocname = mockResp.name;
    } else {
      const { ErpClient } = await import('../client');
      const client = new ErpClient();
      const mapped = mapWorkOrderToErp({
        id: workOrderId,
        production_item: record.production_item as string,
        item_name: record.item_name as string,
        bom_no: record.bom_no as string,
        qty: record.qty as number,
        planned_start_date: record.planned_start_date as string,
        expected_delivery_date: record.expected_delivery_date as string | null,
        project_name: record.project_name as string | null,
        remarks: record.remarks as string | null,
      });
      const result = await client.create<{ name: string }>('Work Order', mapped);
      erpDocname = result.name;
    }

    await upsertSyncMap(supabase, 'work_order', workOrderId, 'Work Order', erpDocname);
    await logEvent(supabase, job.id, 'sync_completed', {
      entity_type: 'work_order',
      entity_id: workOrderId,
      erp_docname: erpDocname,
    });
    await updateJobStatus(supabase, job, 'succeeded');

    return {
      id: job.id,
      status: 'succeeded',
      entity_type: 'work_order',
      entity_id: workOrderId,
      erp_docname: erpDocname,
      attempt_count: job.attempt_count,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return failJob(supabase, job, 'work_order', workOrderId, message);
  }
}
