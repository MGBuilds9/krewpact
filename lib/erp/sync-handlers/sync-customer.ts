/**
 * Sync handler: KrewPact Account → ERPNext Customer
 */

import { createScopedServiceClient } from '@/lib/supabase/server';

import { toErpCustomer } from '../customer-mapper';
import { mockCustomerResponse } from '../mock-responses';
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

export async function syncAccount(
  accountId: string,
  _userId: string,
  jobContext?: SyncJobContext,
): Promise<SyncResult> {
  const supabase = createScopedServiceClient('erp-sync:account');
  const job = await createSyncJob(supabase, 'account', accountId, jobContext);

  try {
    const { data: account, error: accountError } = await supabase
      .from('accounts')
      .select('*')
      .eq('id', accountId)
      .single();

    if (accountError || !account) {
      return failJob(
        supabase,
        job,
        'account',
        accountId,
        `Account not found: ${accountError?.message || 'null'}`,
      );
    }

    const accountData = account as Record<string, unknown>;
    let erpDocname: string;

    if (isMockMode()) {
      const mockResp = mockCustomerResponse({
        id: accountId,
        account_name: accountData.account_name as string,
        account_type: accountData.account_type as string | undefined,
        billing_address: accountData.billing_address as Record<string, unknown> | null,
      });
      erpDocname = mockResp.name;
    } else {
      const { ErpClient } = await import('../client');
      const client = new ErpClient();
      const mapped = toErpCustomer({
        id: accountId,
        account_name: accountData.account_name as string,
        account_type: accountData.account_type as string | null,
        division_id: accountData.division_id as string | null,
        status: accountData.status as string | null,
        billing_address: accountData.billing_address as Record<string, unknown> | null,
        phone: accountData.phone as string | null,
        website: accountData.website as string | null,
        industry: accountData.industry as string | null,
      });
      const result = await client.create<{ name: string }>('Customer', mapped);
      erpDocname = result.name;
    }

    await upsertSyncMap(supabase, 'account', accountId, 'Customer', erpDocname);
    await logEvent(supabase, job.id, 'sync_completed', {
      entity_type: 'account',
      entity_id: accountId,
      erp_docname: erpDocname,
    });
    await updateJobStatus(supabase, job, 'succeeded');

    return {
      id: job.id,
      status: 'succeeded',
      entity_type: 'account',
      entity_id: accountId,
      erp_docname: erpDocname,
      attempt_count: job.attempt_count,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return failJob(supabase, job, 'account', accountId, message);
  }
}
