import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { fromErpSalesInvoice, mapInvoiceStatus } from '@/lib/erp/sales-invoice-mapper';

describe('mapInvoiceStatus', () => {
  it('maps Draft to draft', () => {
    expect(mapInvoiceStatus('Draft')).toBe('draft');
  });

  it('maps Submitted to submitted', () => {
    expect(mapInvoiceStatus('Submitted')).toBe('submitted');
  });

  it('maps Unpaid to submitted', () => {
    expect(mapInvoiceStatus('Unpaid')).toBe('submitted');
  });

  it('maps Overdue to overdue', () => {
    expect(mapInvoiceStatus('Overdue')).toBe('overdue');
  });

  it('maps Partly Paid to paid', () => {
    expect(mapInvoiceStatus('Partly Paid')).toBe('paid');
  });

  it('maps Paid to paid', () => {
    expect(mapInvoiceStatus('Paid')).toBe('paid');
  });

  it('maps Cancelled to cancelled', () => {
    expect(mapInvoiceStatus('Cancelled')).toBe('cancelled');
  });

  it('maps Credit Note Issued to cancelled', () => {
    expect(mapInvoiceStatus('Credit Note Issued')).toBe('cancelled');
  });

  it('defaults unknown status to draft', () => {
    expect(mapInvoiceStatus('SomeUnknownStatus')).toBe('draft');
  });

  it('defaults null to draft', () => {
    expect(mapInvoiceStatus(null)).toBe('draft');
  });

  it('defaults undefined to draft', () => {
    expect(mapInvoiceStatus(undefined)).toBe('draft');
  });
});

describe('fromErpSalesInvoice', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-05T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('maps all fields from a fully populated invoice', () => {
    const result = fromErpSalesInvoice({
      name: 'SINV-00042',
      customer: 'Acme Construction Ltd.',
      posting_date: '2026-03-01',
      due_date: '2026-04-01',
      currency: 'CAD',
      grand_total: 15000.0,
      outstanding_amount: 5000.0,
      status: 'Partly Paid',
      custom_mdm_project_id: 'proj-001',
      custom_mdm_account_id: 'acct-001',
      items: [
        {
          item_name: 'Concrete Work',
          description: 'Foundation pour',
          qty: 10,
          rate: 1500,
          amount: 15000,
        },
      ],
    });

    expect(result.erp_invoice_name).toBe('SINV-00042');
    expect(result.erp_doctype).toBe('Sales Invoice');
    expect(result.customer_name).toBe('Acme Construction Ltd.');
    expect(result.posting_date).toBe('2026-03-01');
    expect(result.due_date).toBe('2026-04-01');
    expect(result.currency).toBe('CAD');
    expect(result.grand_total).toBe(15000.0);
    expect(result.outstanding_amount).toBe(5000.0);
    expect(result.status).toBe('paid');
    expect(result.project_id).toBe('proj-001');
    expect(result.account_id).toBe('acct-001');
    expect(result.synced_at).toBe('2026-03-05T12:00:00.000Z');
  });

  it('maps invoice items correctly', () => {
    const result = fromErpSalesInvoice({
      items: [
        { item_name: 'Widget A', description: 'Desc A', qty: 2, rate: 50, amount: 100 },
        { item_name: 'Widget B', description: 'Desc B', qty: 3, rate: 30, amount: 90 },
      ],
    });
    const items = result.items as Record<string, unknown>[];
    expect(items).toHaveLength(2);
    expect(items[0].item_name).toBe('Widget A');
    expect(items[1].amount).toBe(90);
  });

  it('handles missing optional fields gracefully', () => {
    const result = fromErpSalesInvoice({});
    expect(result.erp_invoice_name).toBe('');
    expect(result.customer_name).toBe('');
    expect(result.posting_date).toBeNull();
    expect(result.due_date).toBeNull();
    expect(result.currency).toBe('CAD');
    expect(result.grand_total).toBe(0);
    expect(result.outstanding_amount).toBe(0);
    expect(result.status).toBe('draft');
    expect(result.project_id).toBeNull();
    expect(result.account_id).toBeNull();
    expect(result.items).toEqual([]);
  });

  it('handles non-numeric grand_total gracefully', () => {
    const result = fromErpSalesInvoice({
      grand_total: 'not-a-number',
      outstanding_amount: null,
    });
    expect(result.grand_total).toBe(0);
    expect(result.outstanding_amount).toBe(0);
  });

  it('handles null items gracefully', () => {
    const result = fromErpSalesInvoice({ items: null });
    expect(result.items).toEqual([]);
  });

  it('handles items with missing fields', () => {
    const result = fromErpSalesInvoice({
      items: [{}],
    });
    const items = result.items as Record<string, unknown>[];
    expect(items).toHaveLength(1);
    expect(items[0].item_name).toBe('');
    expect(items[0].qty).toBe(0);
    expect(items[0].rate).toBe(0);
    expect(items[0].amount).toBe(0);
  });

  it('always sets erp_doctype to Sales Invoice', () => {
    const result = fromErpSalesInvoice({});
    expect(result.erp_doctype).toBe('Sales Invoice');
  });
});
