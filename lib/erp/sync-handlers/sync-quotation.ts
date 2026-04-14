/**
 * Sync handler: KrewPact Estimate → ERPNext Quotation
 */

import { createScopedServiceClient } from '@/lib/supabase/server';

import { mockQuotationResponse } from '../mock-responses';
import { toErpQuotation } from '../quotation-mapper';
import { isMockMode } from '../sync-service';
import {
  createSyncJob,
  deleteSyncMap,
  failJob,
  logEvent,
  lookupErpDocname,
  type SyncJobContext,
  SyncResult,
  updateJobStatus,
  upsertSyncMap,
} from './sync-helpers';

const ENTITY = 'estimate';
const DOCTYPE = 'Quotation';

type MappedLine = {
  description: string;
  quantity: number;
  unit_cost: number;
  unit: string | null;
  line_total: number;
};

function mapLines(rawLines: unknown): MappedLine[] {
  const arr = Array.isArray(rawLines) ? rawLines : rawLines ? [rawLines] : [];
  return arr.map((l: Record<string, unknown>) => ({
    description: l.description as string,
    quantity: l.quantity as number,
    unit_cost: l.unit_cost as number,
    unit: l.unit as string | null,
    line_total: l.line_total as number,
  }));
}

 
async function upsertErpQuotation(
  estimateId: string,
  estimateData: Record<string, unknown>,
  lines: MappedLine[],
  existingDocname: string | null,
): Promise<string> {
  if (isMockMode()) {
    if (existingDocname) return existingDocname;
    const mockResp = mockQuotationResponse(
      {
        id: estimateId,
        estimate_number: estimateData.estimate_number as string,
        subtotal_amount: estimateData.subtotal_amount as number,
        tax_amount: estimateData.tax_amount as number,
        total_amount: estimateData.total_amount as number,
        currency_code: estimateData.currency_code as string | undefined,
        account_id: estimateData.account_id as string | null,
        contact_id: estimateData.contact_id as string | null,
      },
      lines,
    );
    return mockResp.name;
  }

  const { ErpClient } = await import('../client');
  const client = new ErpClient();
  const mapped = toErpQuotation(
    {
      id: estimateId,
      estimate_number: estimateData.estimate_number as string,
      revision_no: estimateData.revision_no as number | null,
      currency_code: estimateData.currency_code as string | null,
      account_id: estimateData.account_id as string | null,
      account_name: (estimateData.account_name as string | null) ?? null,
      erp_customer_name: null,
      notes: estimateData.notes as string | null,
    },
    lines,
  );
  if (existingDocname) {
    await client.update<{ name: string }>(DOCTYPE, existingDocname, mapped);
    return existingDocname;
  }
  const result = await client.create<{ name: string }>(DOCTYPE, mapped);
  return result.name;
}

 
export async function syncEstimate(
  estimateId: string,
  _userId: string,
  jobContext?: SyncJobContext,
): Promise<SyncResult> {
  const supabase = createScopedServiceClient('erp-sync:estimate');
  const job = await createSyncJob(supabase, ENTITY, estimateId, jobContext);
  const existingDocname = await lookupErpDocname(supabase, ENTITY, estimateId);

  try {
    if (jobContext?.operation === 'delete') {
      if (existingDocname && !isMockMode()) {
        const { ErpClient } = await import('../client');
        await new ErpClient().delete(DOCTYPE, existingDocname);
      }
      if (existingDocname) {
        await deleteSyncMap(supabase, ENTITY, estimateId);
      }
      await logEvent(supabase, job.id, 'sync_deleted', {
        entity_type: ENTITY,
        entity_id: estimateId,
        erp_docname: existingDocname,
      });
      await updateJobStatus(supabase, job, 'succeeded');
      return {
        id: job.id,
        status: 'succeeded',
        entity_type: ENTITY,
        entity_id: estimateId,
        erp_docname: existingDocname,
        attempt_count: job.attempt_count,
      };
    }

    const { data: estimate, error: estimateError } = await supabase
      .from('estimates')
      .select('*, estimate_lines(*)')
      .eq('id', estimateId)
      .single();

    if (estimateError || !estimate) {
      return failJob(
        supabase,
        job,
        ENTITY,
        estimateId,
        `Estimate not found: ${estimateError?.message || 'null'}`,
      );
    }

    const estimateData = estimate as Record<string, unknown>;
    const lines = mapLines(estimateData.estimate_lines);
    const erpDocname = await upsertErpQuotation(estimateId, estimateData, lines, existingDocname);

    await upsertSyncMap(supabase, ENTITY, estimateId, DOCTYPE, erpDocname);
    await logEvent(supabase, job.id, existingDocname ? 'sync_updated' : 'sync_completed', {
      entity_type: ENTITY,
      entity_id: estimateId,
      erp_docname: erpDocname,
      line_count: lines.length,
    });
    await updateJobStatus(supabase, job, 'succeeded');

    return {
      id: job.id,
      status: 'succeeded',
      entity_type: ENTITY,
      entity_id: estimateId,
      erp_docname: erpDocname,
      attempt_count: job.attempt_count,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return failJob(supabase, job, ENTITY, estimateId, message);
  }
}
