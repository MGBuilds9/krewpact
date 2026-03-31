/**
 * Sync handler: KrewPact budget -> ERPNext Budget
 */

import { createScopedServiceClient } from '@/lib/supabase/server';

import { mapBudgetToErp } from '../budget-mapper';
import { mockBudgetCreateResponse } from '../mock-responses';
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

export async function syncBudget(
  budgetId: string,
  _userId: string,
  jobContext?: SyncJobContext,
  erpCompany = 'KrewPact',
): Promise<SyncResult> {
  const supabase = createScopedServiceClient('erp-sync:budget');
  const job = await createSyncJob(supabase, 'budget', budgetId, jobContext);

  try {
    const { data: budget, error: budgetError } = await supabase
      .from('budgets')
      .select('*')
      .eq('id', budgetId)
      .single();

    if (budgetError || !budget) {
      return failJob(
        supabase,
        job,
        'budget',
        budgetId,
        `Budget not found: ${budgetError?.message || 'null'}`,
      );
    }

    const record = budget as Record<string, unknown>;
    let erpDocname: string;

    if (isMockMode()) {
      const mockResp = mockBudgetCreateResponse({
        id: budgetId,
        fiscal_year: record.fiscal_year as string,
        company: (record.company as string) || erpCompany,
      });
      erpDocname = mockResp.name;
    } else {
      const { ErpClient } = await import('../client');
      const client = new ErpClient();
      const mapped = mapBudgetToErp({
        id: budgetId,
        budget_against: (record.budget_against as string) || 'Cost Center',
        company: (record.company as string) || erpCompany,
        fiscal_year: record.fiscal_year as string,
        cost_center: record.cost_center as string | null,
        project: record.project as string | null,
        monthly_distribution: record.monthly_distribution as string | null,
        applicable_on_material_request: record.applicable_on_material_request as boolean,
        applicable_on_purchase_order: record.applicable_on_purchase_order as boolean,
        action_if_annual_budget_exceeded:
          (record.action_if_annual_budget_exceeded as string) || 'Warn',
        accounts: ((record.accounts as Record<string, unknown>[]) || []).map((acct) => ({
          account: acct.account as string,
          budget_amount: (acct.budget_amount as number) || 0,
        })),
      });
      const result = await client.create<{ name: string }>('Budget', mapped);
      erpDocname = result.name;
    }

    await upsertSyncMap(supabase, 'budget', budgetId, 'Budget', erpDocname);
    await logEvent(supabase, job.id, 'sync_completed', {
      entity_type: 'budget',
      entity_id: budgetId,
      erp_docname: erpDocname,
    });
    await updateJobStatus(supabase, job, 'succeeded');

    return {
      id: job.id,
      status: 'succeeded',
      entity_type: 'budget',
      entity_id: budgetId,
      erp_docname: erpDocname,
      attempt_count: job.attempt_count,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return failJob(supabase, job, 'budget', budgetId, message);
  }
}
