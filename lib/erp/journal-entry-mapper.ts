/**
 * Maps KrewPact journal entry data to/from ERPNext Journal Entry doctype format.
 * Pure function — no side effects or database calls.
 */

export interface JournalEntryMapInput {
  id: string;
  voucher_type: string;
  posting_date: string;
  company: string;
  user_remark: string | null;
  accounts: JournalEntryAccountInput[];
}

export interface JournalEntryAccountInput {
  account: string;
  party_type: string | null;
  party: string | null;
  debit_in_account_currency: number;
  credit_in_account_currency: number;
  cost_center: string | null;
  project: string | null;
}

/**
 * Map a KrewPact journal entry to an ERPNext Journal Entry document.
 */
export function mapJournalEntryToErp(entry: JournalEntryMapInput): Record<string, unknown> {
  return {
    naming_series: 'ACC-JV-.YYYY.-',
    voucher_type: entry.voucher_type || 'Journal Entry',
    posting_date: entry.posting_date,
    company: entry.company,
    currency: 'CAD',
    user_remark: entry.user_remark || '',
    krewpact_id: entry.id,
    accounts: entry.accounts.map((acct, idx) => ({
      idx: idx + 1,
      account: acct.account,
      party_type: acct.party_type || '',
      party: acct.party || '',
      debit_in_account_currency: acct.debit_in_account_currency,
      credit_in_account_currency: acct.credit_in_account_currency,
      cost_center: acct.cost_center || '',
      project: acct.project || '',
    })),
  };
}

/**
 * Map an ERPNext Journal Entry document to a KrewPact record.
 */
export function fromErpJournalEntry(erpEntry: Record<string, unknown>): Record<string, unknown> {
  return {
    erp_journal_name: erpEntry.name || '',
    erp_doctype: 'Journal Entry',
    voucher_type: erpEntry.voucher_type || 'Journal Entry',
    posting_date: erpEntry.posting_date || null,
    company: erpEntry.company || '',
    total_debit: typeof erpEntry.total_debit === 'number' ? erpEntry.total_debit : 0,
    total_credit: typeof erpEntry.total_credit === 'number' ? erpEntry.total_credit : 0,
    currency: (erpEntry.currency as string) || 'CAD',
    user_remark: erpEntry.user_remark || '',
    accounts: Array.isArray(erpEntry.accounts)
      ? (erpEntry.accounts as Record<string, unknown>[]).map((acct) => ({
          account: acct.account || '',
          debit_in_account_currency: acct.debit_in_account_currency || 0,
          credit_in_account_currency: acct.credit_in_account_currency || 0,
          cost_center: acct.cost_center || '',
          project: acct.project || '',
        }))
      : [],
    synced_at: new Date().toISOString(),
  };
}
