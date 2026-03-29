/**
 * Sync handler: KrewPact payment entry -> ERPNext Payment Entry
 */

import { createScopedServiceClient } from '@/lib/supabase/server';

import { mockPaymentEntryCreateResponse } from '../mock-responses';
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

export async function syncPaymentEntry(
  paymentId: string,
  _userId: string,
  jobContext?: SyncJobContext,
): Promise<SyncResult> {
  const supabase = createScopedServiceClient('erp-sync:payment-entry');
  const job = await createSyncJob(supabase, 'payment_entry', paymentId, jobContext);

  try {
    const { data: payment, error: paymentError } = await supabase
      .from('payment_entries')
      .select('*')
      .eq('id', paymentId)
      .single();

    if (paymentError || !payment) {
      return failJob(
        supabase,
        job,
        'payment_entry',
        paymentId,
        `Payment entry not found: ${paymentError?.message || 'null'}`,
      );
    }

    const record = payment as Record<string, unknown>;
    let erpDocname: string;

    if (isMockMode()) {
      const mockResp = mockPaymentEntryCreateResponse({
        id: paymentId,
        payment_type: record.payment_type as string,
        paid_amount: record.paid_amount as number,
      });
      erpDocname = mockResp.name;
    } else {
      const { ErpClient } = await import('../client');
      const client = new ErpClient();
      const mapped: Record<string, unknown> = {
        naming_series: 'ACC-PAY-.YYYY.-',
        payment_type: record.payment_type || 'Receive',
        posting_date: record.posting_date || new Date().toISOString().split('T')[0],
        party_type: record.party_type || 'Customer',
        party: record.party_name || '',
        paid_amount: record.paid_amount || 0,
        received_amount: record.received_amount || 0,
        currency: (record.currency as string) || 'CAD',
        krewpact_id: paymentId,
      };
      const result = await client.create<{ name: string }>('Payment Entry', mapped);
      erpDocname = result.name;
    }

    await upsertSyncMap(supabase, 'payment_entry', paymentId, 'Payment Entry', erpDocname);
    await logEvent(supabase, job.id, 'sync_completed', {
      entity_type: 'payment_entry',
      entity_id: paymentId,
      erp_docname: erpDocname,
    });
    await updateJobStatus(supabase, job, 'succeeded');

    return {
      id: job.id,
      status: 'succeeded',
      entity_type: 'payment_entry',
      entity_id: paymentId,
      erp_docname: erpDocname,
      attempt_count: job.attempt_count,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return failJob(supabase, job, 'payment_entry', paymentId, message);
  }
}
