import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  type BankAccountMapInput,
  fromErpBankAccount,
  mapBankAccountToErp,
} from '@/lib/erp/bank-account-mapper';

function makeInput(overrides: Partial<BankAccountMapInput> = {}): BankAccountMapInput {
  return {
    id: 'ba-001',
    account_name: 'MDM Operating Account',
    bank: 'TD Canada Trust',
    account_type: 'Bank',
    account_subtype: 'Chequing',
    company: 'MDM Group Inc.',
    iban: null,
    branch_code: '00042',
    is_default: true,
    is_company_account: true,
    ...overrides,
  };
}

describe('mapBankAccountToErp', () => {
  it('maps all fields correctly', () => {
    const result = mapBankAccountToErp(makeInput());
    expect(result.account_name).toBe('MDM Operating Account');
    expect(result.bank).toBe('TD Canada Trust');
    expect(result.account_type).toBe('Bank');
    expect(result.account_subtype).toBe('Chequing');
    expect(result.company).toBe('MDM Group Inc.');
    expect(result.branch_code).toBe('00042');
    expect(result.is_default).toBe(1);
    expect(result.is_company_account).toBe(1);
    expect(result.krewpact_id).toBe('ba-001');
  });

  it('defaults null fields to empty string', () => {
    const result = mapBankAccountToErp(
      makeInput({ account_type: null, iban: null, branch_code: null }),
    );
    expect(result.account_type).toBe('');
    expect(result.iban).toBe('');
    expect(result.branch_code).toBe('');
  });

  it('maps false booleans to 0', () => {
    const result = mapBankAccountToErp(makeInput({ is_default: false, is_company_account: false }));
    expect(result.is_default).toBe(0);
    expect(result.is_company_account).toBe(0);
  });
});

describe('fromErpBankAccount', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-29T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('maps all fields from a fully populated bank account', () => {
    const result = fromErpBankAccount({
      name: 'BA-00042',
      account_name: 'MDM Operating',
      bank: 'TD Canada Trust',
      account_type: 'Bank',
      account_subtype: 'Chequing',
      company: 'MDM Group Inc.',
      iban: 'CA1234567890',
      branch_code: '00042',
      is_default: 1,
      is_company_account: 1,
    });

    expect(result.erp_bank_account_name).toBe('BA-00042');
    expect(result.erp_doctype).toBe('Bank Account');
    expect(result.account_name).toBe('MDM Operating');
    expect(result.is_default).toBe(true);
    expect(result.is_company_account).toBe(true);
    expect(result.synced_at).toBe('2026-03-29T12:00:00.000Z');
  });

  it('handles missing fields gracefully', () => {
    const result = fromErpBankAccount({});
    expect(result.erp_bank_account_name).toBe('');
    expect(result.account_name).toBe('');
    expect(result.bank).toBe('');
    expect(result.is_default).toBe(false);
    expect(result.is_company_account).toBe(false);
  });
});
