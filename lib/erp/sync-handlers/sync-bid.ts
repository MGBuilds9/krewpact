/**
 * Sync handler: KrewPact bids → ERPNext Supplier Quotation
 */

import { createScopedServiceClient } from '@/lib/supabase/server';

import { nextMockId } from '../mock-types';
import { type BidInput, type BidLineInput, toErpSupplierQuotation } from '../bid-mapper';
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

function mapBidLines(rawLines: unknown): BidLineInput[] {
  const arr = Array.isArray(rawLines) ? rawLines : rawLines ? [rawLines] : [];
  return arr.map((line: Record<string, unknown>) => ({
    item_code: line.item_code as string | null,
    description: (line.description as string) || '',
    quantity: (line.quantity as number) || 0,
    unit: line.unit as string | null,
    unit_price: (line.unit_price as number) || 0,
    line_total: (line.line_total as number) || 0,
  }));
}

async function createErpBid(
  bidId: string,
  bidData: Record<string, unknown>,
  lines: BidLineInput[],
): Promise<string> {
  if (isMockMode()) {
    return nextMockId('SQ');
  }

  const { ErpClient } = await import('../client');
  const client = new ErpClient();
  const bidInput: BidInput = {
    id: bidId,
    rfq_id: bidData.rfq_id as string | null,
    supplier_name: bidData.supplier_name as string | null,
    erp_supplier_name: bidData.erp_supplier_name as string | null,
    total_amount: (bidData.total_amount as number) || 0,
    scope_summary: bidData.scope_summary as string | null,
    notes: bidData.notes as string | null,
    currency_code: bidData.currency_code as string | null,
    submitted_at: bidData.submitted_at as string | null,
  };
  const mapped = toErpSupplierQuotation(bidInput, lines);
  const result = await client.create<{ name: string }>('Supplier Quotation', mapped);
  return result.name;
}

export async function syncBid(
  bidId: string,
  _userId: string,
  jobContext?: SyncJobContext,
): Promise<SyncResult> {
  const supabase = createScopedServiceClient('erp-sync:bid');
  const job = await createSyncJob(supabase, 'bid', bidId, jobContext);

  try {
    const { data: bid, error: bidError } = await supabase
      .from('bids')
      .select('*, bid_lines(*)')
      .eq('id', bidId)
      .single();

    if (bidError || !bid) {
      return failJob(
        supabase,
        job,
        'bid',
        bidId,
        `Bid not found: ${bidError?.message || 'null'}`,
      );
    }

    const bidData = bid as Record<string, unknown>;
    const lines = mapBidLines(bidData.bid_lines);
    const erpDocname = await createErpBid(bidId, bidData, lines);

    await upsertSyncMap(supabase, 'bid', bidId, 'Supplier Quotation', erpDocname);
    await logEvent(supabase, job.id, 'sync_completed', {
      entity_type: 'bid',
      entity_id: bidId,
      erp_docname: erpDocname,
      line_count: lines.length,
    });
    await updateJobStatus(supabase, job, 'succeeded');

    return {
      id: job.id,
      status: 'succeeded',
      entity_type: 'bid',
      entity_id: bidId,
      erp_docname: erpDocname,
      attempt_count: job.attempt_count,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return failJob(supabase, job, 'bid', bidId, message);
  }
}
