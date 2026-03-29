import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { fromErpModeOfPayment } from '@/lib/erp/mode-of-payment-mapper';

describe('fromErpModeOfPayment', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-29T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('maps all fields from a fully populated mode of payment', () => {
    const result = fromErpModeOfPayment({
      name: 'Wire Transfer',
      mode_of_payment: 'Wire Transfer',
      type: 'Bank',
      enabled: 1,
      accounts: [
        {
          company: 'MDM Group Inc.',
          default_account: '1200 - Bank - MDM',
        },
      ],
    });

    expect(result.erp_mode_name).toBe('Wire Transfer');
    expect(result.erp_doctype).toBe('Mode of Payment');
    expect(result.mode_of_payment).toBe('Wire Transfer');
    expect(result.type).toBe('Bank');
    expect(result.enabled).toBe(true);
    const accounts = result.accounts as Record<string, unknown>[];
    expect(accounts).toHaveLength(1);
    expect(accounts[0].company).toBe('MDM Group Inc.');
    expect(accounts[0].default_account).toBe('1200 - Bank - MDM');
    expect(result.synced_at).toBe('2026-03-29T12:00:00.000Z');
  });

  it('handles missing fields gracefully', () => {
    const result = fromErpModeOfPayment({});
    expect(result.erp_mode_name).toBe('');
    expect(result.mode_of_payment).toBe('');
    expect(result.type).toBe('');
    expect(result.enabled).toBe(true);
    expect(result.accounts).toEqual([]);
  });

  it('maps enabled = 0 to false', () => {
    const result = fromErpModeOfPayment({ enabled: 0 });
    expect(result.enabled).toBe(false);
  });

  it('handles null accounts gracefully', () => {
    const result = fromErpModeOfPayment({ accounts: null });
    expect(result.accounts).toEqual([]);
  });

  it('uses name as fallback for mode_of_payment', () => {
    const result = fromErpModeOfPayment({ name: 'Cash' });
    expect(result.mode_of_payment).toBe('Cash');
  });

  it('always sets erp_doctype to Mode of Payment', () => {
    const result = fromErpModeOfPayment({});
    expect(result.erp_doctype).toBe('Mode of Payment');
  });
});
