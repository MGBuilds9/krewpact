/**
 * Sync handler: KrewPact bids (status='awarded') → ERPNext Purchase Order
 */

import { createScopedServiceClient } from '@/lib/supabase/server';

import { nextMockId } from '../mock-types';
import { type AwardInput, type AwardLineInput, toErpProcurementPO } from '../award-mapper';
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

function mapAwardLines(rawLines: unknown): AwardLineInput[] {
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

async function createErpPo(
  bidId: string,
  bidData: Record<string, unknown>,
  lines: AwardLineInput[],
): Promise<string> {
  if (isMockMode()) {
    return nextMockId('PO');
  }

  const { ErpClient } = await import('../client');
  const client = new ErpClient();
  const awardInput: AwardInput = {
    id: bidId,
    bid_id: bidId,
    rfq_id: bidData.rfq_id as string | null,
    project_id: bidData.project_id as string,
    project_name: bidData.project_name as string | null,
    supplier_name: bidData.supplier_name as string | null,
    erp_supplier_name: bidData.erp_supplier_name as string | null,
    total_amount: (bidData.total_amount as number) || 0,
    currency_code: bidData.currency_code as string | null,
    award_date: bidData.awarded_at as string | null,
    notes: bidData.notes as string | null,
  };
  const mapped = toErpProcurementPO(awardInput, lines);
  const result = await client.create<{ name: string }>('Purchase Order', mapped);
  return result.name;
}

export async function syncAward(
  bidId: string,
  _userId: string,
  jobContext?: SyncJobContext,
): Promise<SyncResult> {
  const supabase = createScopedServiceClient('erp-sync:award');
  const job = await createSyncJob(supabase, 'award', bidId, jobContext);

  try {
    const { data: bid, error: bidError } = await supabase
      .from('bids')
      .select('*, bid_lines(*)')
      .eq('id', bidId)
      .eq('status', 'awarded')
      .single();

    if (bidError || !bid) {
      return failJob(
        supabase,
        job,
        'award',
        bidId,
        `Awarded bid not found: ${bidError?.message || 'null'}`,
      );
    }

    const bidData = bid as Record<string, unknown>;
    const lines = mapAwardLines(bidData.bid_lines);
    const erpDocname = await createErpPo(bidId, bidData, lines);

    await upsertSyncMap(supabase, 'award', bidId, 'Purchase Order', erpDocname);
    await logEvent(supabase, job.id, 'sync_completed', {
      entity_type: 'award',
      entity_id: bidId,
      erp_docname: erpDocname,
      line_count: lines.length,
    });
    await updateJobStatus(supabase, job, 'succeeded');

    return {
      id: job.id,
      status: 'succeeded',
      entity_type: 'award',
      entity_id: bidId,
      erp_docname: erpDocname,
      attempt_count: job.attempt_count,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return failJob(supabase, job, 'award', bidId, message);
  }
}
