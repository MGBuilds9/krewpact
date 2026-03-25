/**
 * Sync handler: KrewPact Approved Change Order → ERPNext Sales Order Amendment
 *
 * Only syncs change orders with status 'approved'.
 * Creates or updates a Sales Order in ERPNext with the CO amount delta applied.
 */

import { createScopedServiceClient } from '@/lib/supabase/server';

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

export async function syncChangeOrder(
  coId: string,
  _userId: string,
  jobContext?: SyncJobContext,
): Promise<SyncResult> {
  const supabase = createScopedServiceClient('erp-sync:change-order');
  const job = await createSyncJob(supabase, 'change_order', coId, jobContext);

  try {
    const { data: co, error: coError } = await supabase
      .from('change_orders')
      .select('id, project_id, co_number, status, amount_delta, days_delta, reason, approved_at')
      .eq('id', coId)
      .single();

    if (coError || !co) {
      return failJob(
        supabase,
        job,
        'change_order',
        coId,
        `Change order not found: ${coError?.message || 'null'}`,
      );
    }

    if (co.status !== 'approved') {
      return failJob(
        supabase,
        job,
        'change_order',
        coId,
        `Change order must be approved to sync. Current status: ${co.status}`,
      );
    }

    // Resolve the ERPNext Sales Order docname for the linked project
    const { data: syncMapRow } = await supabase
      .from('erp_sync_map')
      .select('erp_docname')
      .eq('entity_type', 'project')
      .eq('local_id', co.project_id as string)
      .maybeSingle();

    const erpSalesOrderName = (syncMapRow?.erp_docname as string) || null;

    let erpDocname: string;

    if (isMockMode()) {
      erpDocname = `SO-AMEND-${co.co_number}`;
    } else {
      const { ErpClient } = await import('../client');
      const client = new ErpClient();

      const payload: Record<string, unknown> = {
        doctype: 'Sales Order',
        krewpact_change_order_id: coId,
        krewpact_co_number: co.co_number,
        krewpact_amount_delta: co.amount_delta ?? 0,
        krewpact_days_delta: co.days_delta ?? 0,
        reason: co.reason ?? '',
        approved_at: co.approved_at,
        amendment_of: erpSalesOrderName ?? '',
      };

      const result = await client.create<{ name: string }>('Sales Order', payload);
      erpDocname = result.name;
    }

    await upsertSyncMap(supabase, 'change_order', coId, 'Sales Order', erpDocname);
    await logEvent(supabase, job.id, 'sync_completed', {
      entity_type: 'change_order',
      entity_id: coId,
      erp_docname: erpDocname,
      co_number: co.co_number,
    });
    await updateJobStatus(supabase, job, 'succeeded');

    return {
      id: job.id,
      status: 'succeeded',
      entity_type: 'change_order',
      entity_id: coId,
      erp_docname: erpDocname,
      attempt_count: job.attempt_count,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return failJob(supabase, job, 'change_order', coId, message);
  }
}
