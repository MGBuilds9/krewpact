/**
 * Sync handler: KrewPact supplier quotation -> ERPNext Supplier Quotation
 */

import { createScopedServiceClient } from '@/lib/supabase/server';

import { mockSupplierQuotationResponse } from '../mock-responses';
import { mapSupplierQuotationToErp } from '../supplier-quotation-mapper';
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

export async function syncSupplierQuotation(
  sqId: string,
  _userId: string,
  jobContext?: SyncJobContext,
): Promise<SyncResult> {
  const supabase = createScopedServiceClient('erp-sync:supplier-quotation');
  const job = await createSyncJob(supabase, 'supplier_quotation', sqId, jobContext);

  try {
    const { data: sq, error: sqError } = await supabase
      .from('supplier_quotations')
      .select('*')
      .eq('id', sqId)
      .single();

    if (sqError || !sq) {
      return failJob(
        supabase,
        job,
        'supplier_quotation',
        sqId,
        `Supplier quotation not found: ${sqError?.message || 'null'}`,
      );
    }

    const record = sq as Record<string, unknown>;
    let erpDocname: string;

    if (isMockMode()) {
      const mockResp = mockSupplierQuotationResponse({
        id: sqId,
        quotation_number: record.quotation_number as string,
        supplier_name: record.supplier_name as string,
        total_amount: record.total_amount as number,
      });
      erpDocname = mockResp.name;
    } else {
      const { ErpClient } = await import('../client');
      const client = new ErpClient();
      const mapped = mapSupplierQuotationToErp({
        id: sqId,
        quotation_number: record.quotation_number as string,
        supplier_name: record.supplier_name as string,
        transaction_date: record.transaction_date as string,
        valid_till: record.valid_till as string | null,
        currency: (record.currency as string) || 'CAD',
        total_amount: record.total_amount as number,
        items: ((record.items as Record<string, unknown>[]) || []).map((item) => ({
          item_code: item.item_code as string,
          item_name: item.item_name as string,
          description: item.description as string,
          qty: item.qty as number,
          rate: item.rate as number,
          amount: item.amount as number,
          uom: (item.uom as string) || 'Nos',
        })),
      });
      const result = await client.create<{ name: string }>('Supplier Quotation', mapped);
      erpDocname = result.name;
    }

    await upsertSyncMap(supabase, 'supplier_quotation', sqId, 'Supplier Quotation', erpDocname);
    await logEvent(supabase, job.id, 'sync_completed', {
      entity_type: 'supplier_quotation',
      entity_id: sqId,
      erp_docname: erpDocname,
    });
    await updateJobStatus(supabase, job, 'succeeded');

    return {
      id: job.id,
      status: 'succeeded',
      entity_type: 'supplier_quotation',
      entity_id: sqId,
      erp_docname: erpDocname,
      attempt_count: job.attempt_count,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return failJob(supabase, job, 'supplier_quotation', sqId, message);
  }
}
