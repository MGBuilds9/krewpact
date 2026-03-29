import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { fromErpGlEntry } from '@/lib/erp/gl-entry-mapper';

describe('fromErpGlEntry', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-29T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('maps all fields from a fully populated GL entry', () => {
    const result = fromErpGlEntry({
      name: 'GL-00042',
      posting_date: '2026-03-29',
      account: '1100 - Accounts Receivable - MDM',
      party_type: 'Customer',
      party: 'Acme Construction Ltd.',
      debit: 5000,
      credit: 0,
      debit_in_account_currency: 5000,
      credit_in_account_currency: 0,
      account_currency: 'CAD',
      cost_center: 'Main - MDM',
      project: 'PRJ-001',
      voucher_type: 'Sales Invoice',
      voucher_no: 'SINV-001',
      against: '4100 - Revenue - MDM',
      company: 'MDM Group Inc.',
      is_cancelled: 0,
    });

    expect(result.erp_gl_name).toBe('GL-00042');
    expect(result.erp_doctype).toBe('GL Entry');
    expect(result.posting_date).toBe('2026-03-29');
    expect(result.account).toBe('1100 - Accounts Receivable - MDM');
    expect(result.party_type).toBe('Customer');
    expect(result.party).toBe('Acme Construction Ltd.');
    expect(result.debit).toBe(5000);
    expect(result.credit).toBe(0);
    expect(result.voucher_type).toBe('Sales Invoice');
    expect(result.voucher_no).toBe('SINV-001');
    expect(result.company).toBe('MDM Group Inc.');
    expect(result.is_cancelled).toBe(false);
    expect(result.synced_at).toBe('2026-03-29T12:00:00.000Z');
  });

  it('handles missing optional fields gracefully', () => {
    const result = fromErpGlEntry({});
    expect(result.erp_gl_name).toBe('');
    expect(result.posting_date).toBeNull();
    expect(result.account).toBe('');
    expect(result.debit).toBe(0);
    expect(result.credit).toBe(0);
    expect(result.debit_in_account_currency).toBe(0);
    expect(result.credit_in_account_currency).toBe(0);
    expect(result.account_currency).toBe('CAD');
    expect(result.is_cancelled).toBe(false);
  });

  it('handles non-numeric amounts gracefully', () => {
    const result = fromErpGlEntry({
      debit: 'not-a-number',
      credit: null,
    });
    expect(result.debit).toBe(0);
    expect(result.credit).toBe(0);
  });

  it('correctly maps is_cancelled = 1 to true', () => {
    const result = fromErpGlEntry({ is_cancelled: 1 });
    expect(result.is_cancelled).toBe(true);
  });

  it('always sets erp_doctype to GL Entry', () => {
    const result = fromErpGlEntry({});
    expect(result.erp_doctype).toBe('GL Entry');
  });
});
