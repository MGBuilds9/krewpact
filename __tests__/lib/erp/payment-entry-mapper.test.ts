import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { fromErpPaymentEntry, mapPaymentStatus } from '@/lib/erp/payment-entry-mapper';

describe('mapPaymentStatus', () => {
  it('maps Draft to draft', () => {
    expect(mapPaymentStatus('Draft')).toBe('draft');
  });

  it('maps Submitted to submitted', () => {
    expect(mapPaymentStatus('Submitted')).toBe('submitted');
  });

  it('maps Cancelled to void', () => {
    expect(mapPaymentStatus('Cancelled')).toBe('void');
  });

  it('defaults unknown status to draft', () => {
    expect(mapPaymentStatus('SomeUnknownStatus')).toBe('draft');
  });

  it('defaults null to draft', () => {
    expect(mapPaymentStatus(null)).toBe('draft');
  });

  it('defaults undefined to draft', () => {
    expect(mapPaymentStatus(undefined)).toBe('draft');
  });
});

describe('fromErpPaymentEntry', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-08T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('maps all fields from a fully populated payment entry', () => {
    const result = fromErpPaymentEntry({
      name: 'PE-00042',
      payment_type: 'Receive',
      posting_date: '2026-03-01',
      party_type: 'Customer',
      party: 'Acme Construction Ltd.',
      paid_amount: 5000.0,
      received_amount: 5000.0,
      currency: 'CAD',
      status: 'Submitted',
      custom_mdm_project_id: 'proj-001',
      references: [
        {
          reference_doctype: 'Sales Invoice',
          reference_name: 'SINV-001',
          total_amount: 10000,
          allocated_amount: 5000,
        },
      ],
    });

    expect(result.erp_payment_name).toBe('PE-00042');
    expect(result.erp_doctype).toBe('Payment Entry');
    expect(result.payment_type).toBe('Receive');
    expect(result.posting_date).toBe('2026-03-01');
    expect(result.party_type).toBe('Customer');
    expect(result.party_name).toBe('Acme Construction Ltd.');
    expect(result.paid_amount).toBe(5000.0);
    expect(result.received_amount).toBe(5000.0);
    expect(result.currency).toBe('CAD');
    expect(result.status).toBe('submitted');
    expect(result.project_id).toBe('proj-001');
    expect(result.synced_at).toBe('2026-03-08T12:00:00.000Z');
  });

  it('maps references correctly', () => {
    const result = fromErpPaymentEntry({
      references: [
        {
          reference_doctype: 'Sales Invoice',
          reference_name: 'SINV-001',
          total_amount: 10000,
          allocated_amount: 5000,
        },
        {
          reference_doctype: 'Sales Invoice',
          reference_name: 'SINV-002',
          total_amount: 8000,
          allocated_amount: 3000,
        },
      ],
    });
    const refs = result.references as Record<string, unknown>[];
    expect(refs).toHaveLength(2);
    expect(refs[0].reference_name).toBe('SINV-001');
    expect(refs[0].allocated_amount).toBe(5000);
    expect(refs[1].reference_name).toBe('SINV-002');
    expect(refs[1].total_amount).toBe(8000);
  });

  it('handles missing optional fields gracefully', () => {
    const result = fromErpPaymentEntry({});
    expect(result.erp_payment_name).toBe('');
    expect(result.payment_type).toBe('');
    expect(result.posting_date).toBeNull();
    expect(result.party_type).toBe('');
    expect(result.party_name).toBe('');
    expect(result.paid_amount).toBe(0);
    expect(result.received_amount).toBe(0);
    expect(result.currency).toBe('CAD');
    expect(result.status).toBe('draft');
    expect(result.project_id).toBeNull();
    expect(result.references).toEqual([]);
  });

  it('handles non-numeric amounts gracefully', () => {
    const result = fromErpPaymentEntry({
      paid_amount: 'not-a-number',
      received_amount: null,
    });
    expect(result.paid_amount).toBe(0);
    expect(result.received_amount).toBe(0);
  });

  it('handles null references gracefully', () => {
    const result = fromErpPaymentEntry({ references: null });
    expect(result.references).toEqual([]);
  });

  it('handles references with missing fields', () => {
    const result = fromErpPaymentEntry({
      references: [{}],
    });
    const refs = result.references as Record<string, unknown>[];
    expect(refs).toHaveLength(1);
    expect(refs[0].reference_doctype).toBe('');
    expect(refs[0].reference_name).toBe('');
    expect(refs[0].total_amount).toBe(0);
    expect(refs[0].allocated_amount).toBe(0);
  });

  it('always sets erp_doctype to Payment Entry', () => {
    const result = fromErpPaymentEntry({});
    expect(result.erp_doctype).toBe('Payment Entry');
  });

  it('maps Pay payment type correctly', () => {
    const result = fromErpPaymentEntry({ payment_type: 'Pay' });
    expect(result.payment_type).toBe('Pay');
  });

  it('maps Internal Transfer payment type correctly', () => {
    const result = fromErpPaymentEntry({ payment_type: 'Internal Transfer' });
    expect(result.payment_type).toBe('Internal Transfer');
  });
});
