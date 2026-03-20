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
import { createUserClient } from '@/lib/supabase/server';

import { mockJournalEntryResponse } from '../mock-responses';
import { isMockMode } from '../sync-service';
import {
  createSyncJob,
  failJob,
  logEvent,
  SyncResult,
  updateJobStatus,
  upsertSyncMap,
} from './sync-helpers';

/** Default ERPNext accounts — should be configurable per org in the future */
const DEFAULT_MATERIAL_EXPENSE_ACCOUNT = 'Cost of Goods Sold - MDM';
const DEFAULT_INVENTORY_ASSET_ACCOUNT = 'Stock In Hand - MDM';
const DEFAULT_COST_CENTER = 'Main - MDM';

interface MaterialCostOptions {
  projectId: string;
  startDate: string;
  endDate: string;
}

/**
 * Look up the ERPNext Project name for a given projects.id.
 */
async function resolveErpProjectName(
  supabase: Awaited<ReturnType<typeof createUserClient>>,
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
export async function syncMaterialCost(
  options: MaterialCostOptions,
  _userId: string,
): Promise<SyncResult> {
  const { projectId, startDate, endDate } = options;
  const entityKey = `${projectId}:${startDate}:${endDate}`;
  const supabase = await createUserClient();
  const job = await createSyncJob(supabase, 'material_cost_journal', entityKey);

  try {
    // 1. Aggregate ledger entries for the project and date range
    //    We want consumption entries (negative value_change = material used)
    const { data: ledgerEntries, error: ledgerError } = await supabase
      .from('inventory_ledger')
      .select('value_change, item_id, transaction_type')
      .eq('project_id', projectId)
      .gte('transacted_at', startDate)
      .lte('transacted_at', endDate)
      .in('transaction_type', ['issue', 'consume', 'adjustment']);

    if (ledgerError) {
      return failJob(
        supabase,
        job.id,
        'material_cost_journal',
        entityKey,
        `Failed to query inventory ledger: ${ledgerError.message}`,
      );
    }

    if (!ledgerEntries || ledgerEntries.length === 0) {
      logger.info('No inventory ledger entries for period', {
        projectId,
        startDate,
        endDate,
      });
      await updateJobStatus(supabase, job.id, 'succeeded');
      return {
        id: job.id,
        status: 'succeeded',
        entity_type: 'material_cost_journal',
        entity_id: entityKey,
        erp_docname: null,
        attempt_count: 1,
      };
    }

    // 2. Sum the absolute value of consumption (value_change is negative for consumption)
    const totalCost = ledgerEntries.reduce((sum, entry) => {
      const val = entry.value_change as number;
      // Consumption entries have negative value_change; we want the absolute cost
      return sum + Math.abs(val);
    }, 0);

    if (totalCost === 0) {
      logger.info('Zero material cost for period — skipping journal entry', {
        projectId,
        startDate,
        endDate,
      });
      await updateJobStatus(supabase, job.id, 'succeeded');
      return {
        id: job.id,
        status: 'succeeded',
        entity_type: 'material_cost_journal',
        entity_id: entityKey,
        erp_docname: null,
        attempt_count: 1,
      };
    }

    // 3. Resolve ERPNext project name for cost center assignment
    const erpProjectName = await resolveErpProjectName(supabase, projectId);
    const costCenter = erpProjectName ? `${erpProjectName} - MDM` : DEFAULT_COST_CENTER;

    // 4. Fetch project details for reference
    const { data: project } = await supabase
      .from('projects')
      .select('project_number, project_name')
      .eq('id', projectId)
      .maybeSingle();

    const projectRef = project
      ? `${(project as Record<string, unknown>).project_number} - ${(project as Record<string, unknown>).project_name}`
      : projectId;

    let erpDocname: string;

    if (isMockMode()) {
      const mockResp = mockJournalEntryResponse({
        id: entityKey,
        amount: totalCost,
        projectRef,
        startDate,
        endDate,
      });
      erpDocname = mockResp.name;
    } else {
      const { ErpClient } = await import('../client');
      const client = new ErpClient();

      const payload: Record<string, unknown> = {
        naming_series: 'JV-.YYYY.-',
        voucher_type: 'Journal Entry',
        posting_date: endDate,
        company: 'MDM Group Inc.',
        user_remark: `Material cost for ${projectRef} (${startDate} to ${endDate}) — ${ledgerEntries.length} ledger entries`,
        krewpact_id: entityKey,
        accounts: [
          {
            // Debit material expense
            account: DEFAULT_MATERIAL_EXPENSE_ACCOUNT,
            debit_in_account_currency: totalCost,
            credit_in_account_currency: 0,
            cost_center: costCenter,
            project: erpProjectName || '',
          },
          {
            // Credit inventory asset
            account: DEFAULT_INVENTORY_ASSET_ACCOUNT,
            debit_in_account_currency: 0,
            credit_in_account_currency: totalCost,
            cost_center: DEFAULT_COST_CENTER,
          },
        ],
      };

      const result = await client.create<{ name: string }>('Journal Entry', payload);
      erpDocname = result.name;
    }

    await upsertSyncMap(supabase, 'material_cost_journal', entityKey, 'Journal Entry', erpDocname);
    await logEvent(supabase, job.id, 'sync_completed', {
      entity_type: 'material_cost_journal',
      entity_id: entityKey,
      erp_docname: erpDocname,
      total_cost: totalCost,
      entry_count: ledgerEntries.length,
    });
    await updateJobStatus(supabase, job.id, 'succeeded');

    return {
      id: job.id,
      status: 'succeeded',
      entity_type: 'material_cost_journal',
      entity_id: entityKey,
      erp_docname: erpDocname,
      attempt_count: 1,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return failJob(supabase, job.id, 'material_cost_journal', entityKey, message);
  }
}
