/**
 * Sync handler: KrewPact journal entry -> ERPNext Journal Entry
 */

import { createScopedServiceClient } from '@/lib/supabase/server';

import { mapJournalEntryToErp } from '../journal-entry-mapper';
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

export async function syncJournalEntry(
  entryId: string,
  _userId: string,
  jobContext?: SyncJobContext,
  erpCompany = 'KrewPact',
): Promise<SyncResult> {
  const supabase = createScopedServiceClient('erp-sync:journal-entry');
  const job = await createSyncJob(supabase, 'journal_entry', entryId, jobContext);

  try {
    const { data: entry, error: entryError } = await supabase
      .from('journal_entries')
      .select('*')
      .eq('id', entryId)
      .single();

    if (entryError || !entry) {
      return failJob(
        supabase,
        job,
        'journal_entry',
        entryId,
        `Journal entry not found: ${entryError?.message || 'null'}`,
      );
    }

    const record = entry as Record<string, unknown>;
    let erpDocname: string;

    if (isMockMode()) {
      const mockResp = mockJournalEntryResponse({
        id: entryId,
        amount: (record.total_debit as number) || 0,
        projectRef: (record.project as string) || '',
        startDate: (record.posting_date as string) || '',
        endDate: (record.posting_date as string) || '',
      });
      erpDocname = mockResp.name;
    } else {
      const { ErpClient } = await import('../client');
      const client = new ErpClient();
      const mapped = mapJournalEntryToErp({
        id: entryId,
        voucher_type: (record.voucher_type as string) || 'Journal Entry',
        posting_date: record.posting_date as string,
        company: (record.company as string) || erpCompany,
        user_remark: record.user_remark as string | null,
        accounts: ((record.accounts as Record<string, unknown>[]) || []).map((acct) => ({
          account: acct.account as string,
          party_type: acct.party_type as string | null,
          party: acct.party as string | null,
          debit_in_account_currency: (acct.debit_in_account_currency as number) || 0,
          credit_in_account_currency: (acct.credit_in_account_currency as number) || 0,
          cost_center: acct.cost_center as string | null,
          project: acct.project as string | null,
        })),
      });
      const result = await client.create<{ name: string }>('Journal Entry', mapped);
      erpDocname = result.name;
    }

    await upsertSyncMap(supabase, 'journal_entry', entryId, 'Journal Entry', erpDocname);
    await logEvent(supabase, job.id, 'sync_completed', {
      entity_type: 'journal_entry',
      entity_id: entryId,
      erp_docname: erpDocname,
    });
    await updateJobStatus(supabase, job, 'succeeded');

    return {
      id: job.id,
      status: 'succeeded',
      entity_type: 'journal_entry',
      entity_id: entryId,
      erp_docname: erpDocname,
      attempt_count: job.attempt_count,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return failJob(supabase, job, 'journal_entry', entryId, message);
  }
}
