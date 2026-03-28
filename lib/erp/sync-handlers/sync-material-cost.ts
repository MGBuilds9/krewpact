/**
 * Sync handler: KrewPact inventory_ledger aggregation -> ERPNext Journal Entry
 *
 * Aggregates ledger entries by project for a date range, then creates
 * a Journal Entry in ERPNext that:
 *   - Debits the project cost center's material expense account
 *   - Credits the inventory asset account
 *   - Amount = SUM(value_change) for consumed inventory in that project/period
 *
 * Intended to run as a daily cron job per active project.
 */

import { logger } from '@/lib/logger';
import { createScopedServiceClient } from '@/lib/supabase/server';

import { mockJournalEntryResponse } from '../mock-responses';
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

/** ERPNext accounts — configurable via env vars, with sensible defaults */
const DEFAULT_MATERIAL_EXPENSE_ACCOUNT =
  process.env.ERPNEXT_COGS_ACCOUNT || 'Cost of Goods Sold - MDM';
const DEFAULT_INVENTORY_ASSET_ACCOUNT = process.env.ERPNEXT_STOCK_ACCOUNT || 'Stock In Hand - MDM';
const DEFAULT_COST_CENTER = process.env.ERPNEXT_WAREHOUSE || 'Main - MDM';

interface MaterialCostOptions {
  projectId: string;
  startDate: string;
  endDate: string;
}

interface CreateJournalEntryParams {
  entityKey: string;
  totalCost: number;
  erpProjectName: string | null;
  costCenter: string;
  projectRef: string;
  startDate: string;
  endDate: string;
  entryCount: number;
}

async function createJournalEntryInErp(params: CreateJournalEntryParams): Promise<string> {
  const {
    entityKey,
    totalCost,
    erpProjectName,
    costCenter,
    projectRef,
    startDate,
    endDate,
    entryCount,
  } = params;
  if (isMockMode()) {
    const mockResp = mockJournalEntryResponse({
      id: entityKey,
      amount: totalCost,
      projectRef,
      startDate,
      endDate,
    });
    return mockResp.name;
  }

  const { ErpClient } = await import('../client');
  const client = new ErpClient();
  const payload: Record<string, unknown> = {
    naming_series: 'JV-.YYYY.-',
    voucher_type: 'Journal Entry',
    posting_date: endDate,
    company: 'MDM Group Inc.',
    user_remark: `Material cost for ${projectRef} (${startDate} to ${endDate}) — ${entryCount} ledger entries`,
    krewpact_id: entityKey,
    accounts: [
      {
        account: DEFAULT_MATERIAL_EXPENSE_ACCOUNT,
        debit_in_account_currency: totalCost,
        credit_in_account_currency: 0,
        cost_center: costCenter,
        project: erpProjectName || '',
      },
      {
        account: DEFAULT_INVENTORY_ASSET_ACCOUNT,
        debit_in_account_currency: 0,
        credit_in_account_currency: totalCost,
        cost_center: DEFAULT_COST_CENTER,
      },
    ],
  };
  const result = await client.create<{ name: string }>('Journal Entry', payload);
  return result.name;
}

/**
 * Look up the ERPNext Project name for a given projects.id.
 */
async function resolveErpProjectName(
  supabase: ReturnType<typeof createScopedServiceClient>,
  projectId: string,
): Promise<string | null> {
  const { data: syncMapRow } = await supabase
    .from('erp_sync_map')
    .select('erp_docname')
    .eq('entity_type', 'project')
    .eq('local_id', projectId)
    .maybeSingle();

  return (syncMapRow?.erp_docname as string) || null;
}

/**
 * Sync material cost journal entry for a project and date range.
 *
 * Aggregates inventory_ledger value_change for consumption transactions
 * (issue, consume, adjustment with negative value) and creates a
 * Journal Entry in ERPNext debiting material expense and crediting
 * inventory asset.
 */
type SupabaseClient = ReturnType<typeof createScopedServiceClient>;

async function fetchLedgerEntries(
  supabase: SupabaseClient,
  projectId: string,
  startDate: string,
  endDate: string,
) {
  return supabase
    .from('inventory_ledger')
    .select('value_change, item_id, transaction_type')
    .eq('project_id', projectId)
    .gte('transacted_at', startDate)
    .lte('transacted_at', endDate)
    .in('transaction_type', ['issue', 'consume', 'adjustment']);
}

async function resolveProjectRef(supabase: SupabaseClient, projectId: string): Promise<string> {
  const { data: project } = await supabase
    .from('projects')
    .select('project_number, project_name')
    .eq('id', projectId)
    .maybeSingle();
  return project
    ? `${(project as Record<string, unknown>).project_number} - ${(project as Record<string, unknown>).project_name}`
    : projectId;
}

// eslint-disable-next-line max-lines-per-function
export async function syncMaterialCost(
  options: MaterialCostOptions,
  _userId: string,
  jobContext?: SyncJobContext,
): Promise<SyncResult> {
  const { projectId, startDate, endDate } = options;
  const entityKey = `${projectId}:${startDate}:${endDate}`;
  const supabase = createScopedServiceClient('erp-sync:material-cost');
  const job = await createSyncJob(supabase, 'material_cost_journal', entityKey, jobContext);

  try {
    const { data: ledgerEntries, error: ledgerError } = await fetchLedgerEntries(
      supabase,
      projectId,
      startDate,
      endDate,
    );
    if (ledgerError)
      return failJob(
        supabase,
        job,
        'material_cost_journal',
        entityKey,
        `Failed to query inventory ledger: ${ledgerError.message}`,
      );

    const emptyResult = {
      id: job.id,
      status: 'succeeded' as const,
      entity_type: 'material_cost_journal',
      entity_id: entityKey,
      erp_docname: null,
      attempt_count: job.attempt_count,
    };
    if (!ledgerEntries || ledgerEntries.length === 0) {
      logger.info('No inventory ledger entries for period', { projectId, startDate, endDate });
      await updateJobStatus(supabase, job, 'succeeded');
      return emptyResult;
    }

    const totalCost = ledgerEntries.reduce(
      (sum, entry) => sum + Math.abs(entry.value_change as number),
      0,
    );
    if (totalCost === 0) {
      logger.info('Zero material cost for period — skipping journal entry', {
        projectId,
        startDate,
        endDate,
      });
      await updateJobStatus(supabase, job, 'succeeded');
      return emptyResult;
    }

    const erpProjectName = await resolveErpProjectName(supabase, projectId);
    const costCenter = erpProjectName ? `${erpProjectName} - MDM` : DEFAULT_COST_CENTER;
    const projectRef = await resolveProjectRef(supabase, projectId);

    const erpDocname = await createJournalEntryInErp({
      entityKey,
      totalCost,
      erpProjectName,
      costCenter,
      projectRef,
      startDate,
      endDate,
      entryCount: ledgerEntries.length,
    });

    await upsertSyncMap(supabase, 'material_cost_journal', entityKey, 'Journal Entry', erpDocname);
    await logEvent(supabase, job.id, 'sync_completed', {
      entity_type: 'material_cost_journal',
      entity_id: entityKey,
      erp_docname: erpDocname,
      total_cost: totalCost,
      entry_count: ledgerEntries.length,
    });
    await updateJobStatus(supabase, job, 'succeeded');
    return {
      id: job.id,
      status: 'succeeded',
      entity_type: 'material_cost_journal',
      entity_id: entityKey,
      erp_docname: erpDocname,
      attempt_count: job.attempt_count,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return failJob(supabase, job, 'material_cost_journal', entityKey, message);
  }
}
