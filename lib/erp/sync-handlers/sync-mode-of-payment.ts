/**
 * Sync handler: ERPNext Mode of Payment -> KrewPact (inbound read)
 * Mode of Payment is reference data — rarely written from KrewPact.
 */

import { createScopedServiceClient } from '@/lib/supabase/server';

import { mockModeOfPaymentResponse } from '../mock-responses';
import { fromErpModeOfPayment } from '../mode-of-payment-mapper';
import { isMockMode } from '../sync-service';
import {
  createSyncJob,
  failJob,
  logEvent,
  type SyncJobContext,
  SyncResult,
  updateJobStatus,
} from './sync-helpers';

export async function readModeOfPayment(
  erpDocname: string,
  jobContext?: SyncJobContext,
): Promise<SyncResult> {
  const supabase = createScopedServiceClient('erp-sync:read-mode-of-payment');
  const job = await createSyncJob(supabase, 'mode_of_payment', erpDocname, jobContext);

  try {
    let modeData: Record<string, unknown>;

    if (isMockMode()) {
      const mockResp = mockModeOfPaymentResponse(erpDocname);
      modeData = mockResp.data;
    } else {
      const { ErpClient } = await import('../client');
      const client = new ErpClient();
      modeData = await client.get<Record<string, unknown>>('Mode of Payment', erpDocname);
    }

    const mapped = fromErpModeOfPayment(modeData);

    await supabase.from('erp_sync_events').insert({
      job_id: job.id,
      event_type: 'mode_of_payment_read',
      event_payload: mapped,
    });

    await logEvent(supabase, job.id, 'sync_completed', {
      entity_type: 'mode_of_payment',
      erp_docname: erpDocname,
    });
    await updateJobStatus(supabase, job, 'succeeded');

    return {
      id: job.id,
      status: 'succeeded',
      entity_type: 'mode_of_payment',
      entity_id: erpDocname,
      erp_docname: erpDocname,
      attempt_count: job.attempt_count,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return failJob(supabase, job, 'mode_of_payment', erpDocname, message);
  }
}
