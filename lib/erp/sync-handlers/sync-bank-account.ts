/**
 * Sync handler: KrewPact bank account -> ERPNext Bank Account
 */

import { createScopedServiceClient } from '@/lib/supabase/server';

import { mapBankAccountToErp } from '../bank-account-mapper';
import { mockBankAccountCreateResponse } from '../mock-responses';
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

export async function syncBankAccount(
  bankAccountId: string,
  _userId: string,
  jobContext?: SyncJobContext,
  erpCompany = 'KrewPact',
): Promise<SyncResult> {
  const supabase = createScopedServiceClient('erp-sync:bank-account');
  const job = await createSyncJob(supabase, 'bank_account', bankAccountId, jobContext);

  try {
    const { data: ba, error: baError } = await supabase
      .from('bank_accounts')
      .select('*')
      .eq('id', bankAccountId)
      .single();

    if (baError || !ba) {
      return failJob(
        supabase,
        job,
        'bank_account',
        bankAccountId,
        `Bank account not found: ${baError?.message || 'null'}`,
      );
    }

    const record = ba as Record<string, unknown>;
    let erpDocname: string;

    if (isMockMode()) {
      const mockResp = mockBankAccountCreateResponse({
        id: bankAccountId,
        account_name: record.account_name as string,
        bank: record.bank as string,
      });
      erpDocname = mockResp.name;
    } else {
      const { ErpClient } = await import('../client');
      const client = new ErpClient();
      const mapped = mapBankAccountToErp({
        id: bankAccountId,
        account_name: record.account_name as string,
        bank: record.bank as string,
        account_type: record.account_type as string | null,
        account_subtype: record.account_subtype as string | null,
        company: (record.company as string) || erpCompany,
        iban: record.iban as string | null,
        branch_code: record.branch_code as string | null,
        is_default: record.is_default as boolean,
        is_company_account: record.is_company_account as boolean,
      });
      const result = await client.create<{ name: string }>('Bank Account', mapped);
      erpDocname = result.name;
    }

    await upsertSyncMap(supabase, 'bank_account', bankAccountId, 'Bank Account', erpDocname);
    await logEvent(supabase, job.id, 'sync_completed', {
      entity_type: 'bank_account',
      entity_id: bankAccountId,
      erp_docname: erpDocname,
    });
    await updateJobStatus(supabase, job, 'succeeded');

    return {
      id: job.id,
      status: 'succeeded',
      entity_type: 'bank_account',
      entity_id: bankAccountId,
      erp_docname: erpDocname,
      attempt_count: job.attempt_count,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return failJob(supabase, job, 'bank_account', bankAccountId, message);
  }
}
