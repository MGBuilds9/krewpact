import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  fromErpJournalEntry,
  type JournalEntryMapInput,
  mapJournalEntryToErp,
} from '@/lib/erp/journal-entry-mapper';

function makeInput(overrides: Partial<JournalEntryMapInput> = {}): JournalEntryMapInput {
  return {
    id: 'je-001',
    voucher_type: 'Journal Entry',
    posting_date: '2026-03-29',
    company: 'MDM Group Inc.',
    user_remark: 'Material cost allocation',
    accounts: [
      {
        account: '5100 - Cost of Goods Sold - MDM',
        party_type: null,
        party: null,
        debit_in_account_currency: 5000,
        credit_in_account_currency: 0,
        cost_center: 'Contracting - MDM',
        project: 'PRJ-001',
      },
      {
        account: '2100 - Accounts Payable - MDM',
        party_type: 'Supplier',
        party: 'Premier Electrical',
        debit_in_account_currency: 0,
        credit_in_account_currency: 5000,
        cost_center: null,
        project: null,
      },
    ],
    ...overrides,
  };
}

describe('mapJournalEntryToErp', () => {
  it('maps all header fields correctly', () => {
    const result = mapJournalEntryToErp(makeInput());
    expect(result.naming_series).toBe('ACC-JV-.YYYY.-');
    expect(result.voucher_type).toBe('Journal Entry');
    expect(result.posting_date).toBe('2026-03-29');
    expect(result.company).toBe('MDM Group Inc.');
    expect(result.currency).toBe('CAD');
    expect(result.user_remark).toBe('Material cost allocation');
    expect(result.krewpact_id).toBe('je-001');
  });

  it('maps account lines with sequential idx', () => {
    const result = mapJournalEntryToErp(makeInput());
    const accounts = result.accounts as Record<string, unknown>[];
    expect(accounts).toHaveLength(2);
    expect(accounts[0].idx).toBe(1);
    expect(accounts[0].account).toBe('5100 - Cost of Goods Sold - MDM');
    expect(accounts[0].debit_in_account_currency).toBe(5000);
    expect(accounts[0].credit_in_account_currency).toBe(0);
    expect(accounts[1].idx).toBe(2);
    expect(accounts[1].party_type).toBe('Supplier');
    expect(accounts[1].party).toBe('Premier Electrical');
  });

  it('defaults user_remark to empty string when null', () => {
    const result = mapJournalEntryToErp(makeInput({ user_remark: null }));
    expect(result.user_remark).toBe('');
  });

  it('defaults voucher_type when empty', () => {
    const result = mapJournalEntryToErp(makeInput({ voucher_type: '' }));
    expect(result.voucher_type).toBe('Journal Entry');
  });

  it('defaults null party fields to empty string', () => {
    const result = mapJournalEntryToErp(makeInput());
    const accounts = result.accounts as Record<string, unknown>[];
    expect(accounts[0].party_type).toBe('');
    expect(accounts[0].party).toBe('');
  });
});

describe('fromErpJournalEntry', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-29T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('maps all fields from a fully populated journal entry', () => {
    const result = fromErpJournalEntry({
      name: 'JV-00042',
      voucher_type: 'Journal Entry',
      posting_date: '2026-03-29',
      company: 'MDM Group Inc.',
      total_debit: 5000,
      total_credit: 5000,
      currency: 'CAD',
      user_remark: 'Cost allocation',
      accounts: [
        {
          account: '5100 - COGS - MDM',
          debit_in_account_currency: 5000,
          credit_in_account_currency: 0,
          cost_center: 'Main - MDM',
          project: 'PRJ-001',
        },
      ],
    });

    expect(result.erp_journal_name).toBe('JV-00042');
    expect(result.erp_doctype).toBe('Journal Entry');
    expect(result.total_debit).toBe(5000);
    expect(result.total_credit).toBe(5000);
    expect(result.synced_at).toBe('2026-03-29T12:00:00.000Z');
  });

  it('handles missing optional fields gracefully', () => {
    const result = fromErpJournalEntry({});
    expect(result.erp_journal_name).toBe('');
    expect(result.voucher_type).toBe('Journal Entry');
    expect(result.posting_date).toBeNull();
    expect(result.total_debit).toBe(0);
    expect(result.total_credit).toBe(0);
    expect(result.currency).toBe('CAD');
    expect(result.accounts).toEqual([]);
  });

  it('handles non-numeric amounts gracefully', () => {
    const result = fromErpJournalEntry({
      total_debit: 'not-a-number',
      total_credit: null,
    });
    expect(result.total_debit).toBe(0);
    expect(result.total_credit).toBe(0);
  });
});
