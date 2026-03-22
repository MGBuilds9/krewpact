/**
 * Sync handler: KrewPact Expense Claim → ERPNext Expense Claim
 */

import { createScopedServiceClient } from '@/lib/supabase/server';

import { mapExpenseToErp } from '../expense-mapper';
import { mockExpenseClaimResponse } from '../mock-responses';
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

export async function syncExpenseClaim(
  expenseClaimId: string,
  _userId: string,
  jobContext?: SyncJobContext,
): Promise<SyncResult> {
  const supabase = createScopedServiceClient('erp-sync:expense-claim');
  const job = await createSyncJob(supabase, 'expense_claim', expenseClaimId, jobContext);

  try {
    const { data: expense, error: expenseError } = await supabase
      .from('expense_claims')
      .select('*')
      .eq('id', expenseClaimId)
      .single();

    if (expenseError || !expense) {
      return failJob(
        supabase,
        job,
        'expense_claim',
        expenseClaimId,
        `Expense claim not found: ${expenseError?.message || 'null'}`,
      );
    }

    const e = expense as Record<string, unknown>;
    let erpDocname: string;

    if (isMockMode()) {
      const mockResp = mockExpenseClaimResponse({
        id: expenseClaimId,
        amount: e.amount as number,
        expense_date: e.expense_date as string,
      });
      erpDocname = mockResp.name;
    } else {
      const { ErpClient } = await import('../client');
      const client = new ErpClient();
      const mapped = mapExpenseToErp({
        id: expenseClaimId,
        user_id: e.user_id as string,
        project_id: e.project_id as string | null,
        amount: e.amount as number,
        tax_amount: e.tax_amount as number | null,
        category: e.category as string | null,
        description: e.description as string | null,
        expense_date: e.expense_date as string,
        currency_code: e.currency_code as string | null,
      });
      const result = await client.create<{ name: string }>('Expense Claim', mapped);
      erpDocname = result.name;
    }

    await upsertSyncMap(supabase, 'expense_claim', expenseClaimId, 'Expense Claim', erpDocname);
    await logEvent(supabase, job.id, 'sync_completed', {
      entity_type: 'expense_claim',
      entity_id: expenseClaimId,
      erp_docname: erpDocname,
    });
    await updateJobStatus(supabase, job, 'succeeded');

    return {
      id: job.id,
      status: 'succeeded',
      entity_type: 'expense_claim',
      entity_id: expenseClaimId,
      erp_docname: erpDocname,
      attempt_count: job.attempt_count,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return failJob(supabase, job, 'expense_claim', expenseClaimId, message);
  }
}
