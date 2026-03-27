/**
 * Sync handler: KrewPact rfq_packages → ERPNext Request for Quotation
 */

import { createScopedServiceClient } from '@/lib/supabase/server';

import { nextMockId } from '../mock-types';
import { type RfqItemInput, type RfqPackageInput, toErpRequestForQuotation } from '../rfq-mapper';
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

function mapRfqItems(rawItems: unknown): RfqItemInput[] {
  const arr = Array.isArray(rawItems) ? rawItems : rawItems ? [rawItems] : [];
  return arr.map((item: Record<string, unknown>) => ({
    item_code: item.item_code as string | null,
    description: (item.description as string) || '',
    quantity: (item.quantity as number) || 0,
    unit: item.unit as string | null,
    estimated_cost: item.estimated_cost as number | null,
  }));
}

async function createErpRfq(
  rfqId: string,
  rfqData: Record<string, unknown>,
  items: RfqItemInput[],
): Promise<string> {
  if (isMockMode()) {
    return nextMockId('RFQ');
  }

  const { ErpClient } = await import('../client');
  const client = new ErpClient();
  const rfqInput: RfqPackageInput = {
    id: rfqId,
    rfq_number: rfqData.rfq_number as string,
    project_id: rfqData.project_id as string,
    project_name: rfqData.project_name as string | null,
    title: rfqData.title as string,
    description: rfqData.description as string | null,
    scope_of_work: rfqData.scope_of_work as string | null,
    due_date: rfqData.due_date as string | null,
    currency_code: rfqData.currency_code as string | null,
    status: rfqData.status as string,
  };
  const mapped = toErpRequestForQuotation(rfqInput, items);
  const result = await client.create<{ name: string }>('Request for Quotation', mapped);
  return result.name;
}

export async function syncRfqPackage(
  rfqId: string,
  _userId: string,
  jobContext?: SyncJobContext,
): Promise<SyncResult> {
  const supabase = createScopedServiceClient('erp-sync:rfq');
  const job = await createSyncJob(supabase, 'rfq_package', rfqId, jobContext);

  try {
    const { data: rfq, error: rfqError } = await supabase
      .from('rfq_packages')
      .select('*, rfq_items(*)')
      .eq('id', rfqId)
      .single();

    if (rfqError || !rfq) {
      return failJob(
        supabase,
        job,
        'rfq_package',
        rfqId,
        `RFQ package not found: ${rfqError?.message || 'null'}`,
      );
    }

    const rfqData = rfq as Record<string, unknown>;
    const items = mapRfqItems(rfqData.rfq_items);
    const erpDocname = await createErpRfq(rfqId, rfqData, items);

    await upsertSyncMap(supabase, 'rfq_package', rfqId, 'Request for Quotation', erpDocname);
    await logEvent(supabase, job.id, 'sync_completed', {
      entity_type: 'rfq_package',
      entity_id: rfqId,
      erp_docname: erpDocname,
      item_count: items.length,
    });
    await updateJobStatus(supabase, job, 'succeeded');

    return {
      id: job.id,
      status: 'succeeded',
      entity_type: 'rfq_package',
      entity_id: rfqId,
      erp_docname: erpDocname,
      attempt_count: job.attempt_count,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return failJob(supabase, job, 'rfq_package', rfqId, message);
  }
}
