/**
 * Sync handler: KrewPact RFQ -> ERPNext Request for Quotation
 */

import { createScopedServiceClient } from '@/lib/supabase/server';

import { mockRequestForQuotationResponse } from '../mock-responses';
import { mapRequestForQuotationToErp } from '../request-for-quotation-mapper';
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

// eslint-disable-next-line max-lines-per-function
export async function syncRequestForQuotation(
  rfqId: string,
  _userId: string,
  jobContext?: SyncJobContext,
): Promise<SyncResult> {
  const supabase = createScopedServiceClient('erp-sync:request-for-quotation');
  const job = await createSyncJob(supabase, 'request_for_quotation', rfqId, jobContext);

  try {
    const { data: rfq, error: rfqError } = await supabase
      .from('request_for_quotations')
      .select('*')
      .eq('id', rfqId)
      .single();

    if (rfqError || !rfq) {
      return failJob(
        supabase,
        job,
        'request_for_quotation',
        rfqId,
        `Request for quotation not found: ${rfqError?.message || 'null'}`,
      );
    }

    const record = rfq as Record<string, unknown>;
    let erpDocname: string;

    if (isMockMode()) {
      const mockResp = mockRequestForQuotationResponse({
        id: rfqId,
        rfq_number: record.rfq_number as string,
        supplier_count: ((record.suppliers as unknown[]) || []).length,
      });
      erpDocname = mockResp.name;
    } else {
      const { ErpClient } = await import('../client');
      const client = new ErpClient();
      const mapped = mapRequestForQuotationToErp({
        id: rfqId,
        rfq_number: record.rfq_number as string,
        transaction_date: record.transaction_date as string,
        message_for_supplier: record.message_for_supplier as string | null,
        suppliers: ((record.suppliers as Record<string, unknown>[]) || []).map((s) => ({
          supplier_name: s.supplier_name as string,
          email: s.email as string | null,
        })),
        items: ((record.items as Record<string, unknown>[]) || []).map((item) => ({
          item_code: item.item_code as string,
          item_name: item.item_name as string,
          description: item.description as string,
          qty: item.qty as number,
          uom: (item.uom as string) || 'Nos',
          warehouse: item.warehouse as string | null,
        })),
      });
      const result = await client.create<{ name: string }>('Request for Quotation', mapped);
      erpDocname = result.name;
    }

    await upsertSyncMap(
      supabase,
      'request_for_quotation',
      rfqId,
      'Request for Quotation',
      erpDocname,
    );
    await logEvent(supabase, job.id, 'sync_completed', {
      entity_type: 'request_for_quotation',
      entity_id: rfqId,
      erp_docname: erpDocname,
    });
    await updateJobStatus(supabase, job, 'succeeded');

    return {
      id: job.id,
      status: 'succeeded',
      entity_type: 'request_for_quotation',
      entity_id: rfqId,
      erp_docname: erpDocname,
      attempt_count: job.attempt_count,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return failJob(supabase, job, 'request_for_quotation', rfqId, message);
  }
}
