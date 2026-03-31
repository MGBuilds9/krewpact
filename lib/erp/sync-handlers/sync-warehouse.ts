/**
 * Sync handler: KrewPact warehouse -> ERPNext Warehouse
 */

import { createScopedServiceClient } from '@/lib/supabase/server';

import { mockWarehouseResponse } from '../mock-responses';
import { isMockMode } from '../sync-service';
import { mapWarehouseToErp } from '../warehouse-mapper';
import {
  createSyncJob,
  failJob,
  logEvent,
  type SyncJobContext,
  SyncResult,
  updateJobStatus,
  upsertSyncMap,
} from './sync-helpers';

export async function syncWarehouse(
  warehouseId: string,
  _userId: string,
  jobContext?: SyncJobContext,
  erpCompany = 'KrewPact',
): Promise<SyncResult> {
  const supabase = createScopedServiceClient('erp-sync:warehouse');
  const job = await createSyncJob(supabase, 'warehouse', warehouseId, jobContext);

  try {
    const { data: wh, error: whError } = await supabase
      .from('warehouses')
      .select('*')
      .eq('id', warehouseId)
      .single();

    if (whError || !wh) {
      return failJob(
        supabase,
        job,
        'warehouse',
        warehouseId,
        `Warehouse not found: ${whError?.message || 'null'}`,
      );
    }

    const record = wh as Record<string, unknown>;
    let erpDocname: string;

    if (isMockMode()) {
      const mockResp = mockWarehouseResponse({
        id: warehouseId,
        warehouse_name: record.warehouse_name as string,
      });
      erpDocname = mockResp.name;
    } else {
      const { ErpClient } = await import('../client');
      const client = new ErpClient();
      const mapped = mapWarehouseToErp({
        id: warehouseId,
        warehouse_name: record.warehouse_name as string,
        warehouse_type: record.warehouse_type as string | null,
        parent_warehouse: record.parent_warehouse as string | null,
        company: (record.company as string) || erpCompany,
        is_group: record.is_group as boolean,
      });
      const result = await client.create<{ name: string }>('Warehouse', mapped);
      erpDocname = result.name;
    }

    await upsertSyncMap(supabase, 'warehouse', warehouseId, 'Warehouse', erpDocname);
    await logEvent(supabase, job.id, 'sync_completed', {
      entity_type: 'warehouse',
      entity_id: warehouseId,
      erp_docname: erpDocname,
    });
    await updateJobStatus(supabase, job, 'succeeded');

    return {
      id: job.id,
      status: 'succeeded',
      entity_type: 'warehouse',
      entity_id: warehouseId,
      erp_docname: erpDocname,
      attempt_count: job.attempt_count,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return failJob(supabase, job, 'warehouse', warehouseId, message);
  }
}
