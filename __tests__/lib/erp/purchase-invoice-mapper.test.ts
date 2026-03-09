import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  fromErpPurchaseInvoice,
  mapPurchaseInvoiceStatus,
} from '@/lib/erp/purchase-invoice-mapper';

describe('mapPurchaseInvoiceStatus', () => {
  it('maps Draft to draft', () => {
    expect(mapPurchaseInvoiceStatus('Draft')).toBe('draft');
  });

  it('maps Submitted to submitted', () => {
    expect(mapPurchaseInvoiceStatus('Submitted')).toBe('submitted');
  });

  it('maps Unpaid to unpaid', () => {
    expect(mapPurchaseInvoiceStatus('Unpaid')).toBe('unpaid');
  });

  it('maps Overdue to overdue', () => {
    expect(mapPurchaseInvoiceStatus('Overdue')).toBe('overdue');
  });

  it('maps Partly Paid to partially_paid', () => {
    expect(mapPurchaseInvoiceStatus('Partly Paid')).toBe('partially_paid');
  });

  it('maps Paid to paid', () => {
    expect(mapPurchaseInvoiceStatus('Paid')).toBe('paid');
  });

  it('maps Cancelled to void', () => {
    expect(mapPurchaseInvoiceStatus('Cancelled')).toBe('void');
  });

  it('maps Return to void', () => {
    expect(mapPurchaseInvoiceStatus('Return')).toBe('void');
  });

  it('defaults unknown status to draft', () => {
    expect(mapPurchaseInvoiceStatus('SomeUnknownStatus')).toBe('draft');
  });

  it('defaults null to draft', () => {
    expect(mapPurchaseInvoiceStatus(null)).toBe('draft');
  });

  it('defaults undefined to draft', () => {
    expect(mapPurchaseInvoiceStatus(undefined)).toBe('draft');
  });
});

describe('fromErpPurchaseInvoice', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-08T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('maps all fields from a fully populated invoice', () => {
    const result = fromErpPurchaseInvoice({
      name: 'PINV-00042',
      supplier: 'ABC Supplies Ltd.',
      posting_date: '2026-03-01',
      due_date: '2026-04-01',
      currency: 'CAD',
      grand_total: 8000.0,
      outstanding_amount: 3000.0,
      status: 'Partly Paid',
      custom_mdm_project_id: 'proj-001',
      custom_mdm_supplier_id: 'sup-001',
      items: [
        {
          item_name: 'Lumber',
          description: '2x4 framing lumber',
          qty: 100,
          rate: 80,
          amount: 8000,
        },
      ],
    });

    expect(result.erp_invoice_name).toBe('PINV-00042');
    expect(result.erp_doctype).toBe('Purchase Invoice');
    expect(result.supplier_name).toBe('ABC Supplies Ltd.');
    expect(result.posting_date).toBe('2026-03-01');
    expect(result.due_date).toBe('2026-04-01');
    expect(result.currency).toBe('CAD');
    expect(result.grand_total).toBe(8000.0);
    expect(result.outstanding_amount).toBe(3000.0);
    expect(result.status).toBe('partially_paid');
    expect(result.project_id).toBe('proj-001');
    expect(result.supplier_id).toBe('sup-001');
    expect(result.synced_at).toBe('2026-03-08T12:00:00.000Z');
  });

  it('maps invoice items correctly', () => {
    const result = fromErpPurchaseInvoice({
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
    const result = fromErpPurchaseInvoice({});
    expect(result.erp_invoice_name).toBe('');
    expect(result.supplier_name).toBe('');
    expect(result.posting_date).toBeNull();
    expect(result.due_date).toBeNull();
    expect(result.currency).toBe('CAD');
    expect(result.grand_total).toBe(0);
    expect(result.outstanding_amount).toBe(0);
    expect(result.status).toBe('draft');
    expect(result.project_id).toBeNull();
    expect(result.supplier_id).toBeNull();
    expect(result.items).toEqual([]);
  });

  it('handles non-numeric grand_total gracefully', () => {
    const result = fromErpPurchaseInvoice({
      grand_total: 'not-a-number',
      outstanding_amount: null,
    });
    expect(result.grand_total).toBe(0);
    expect(result.outstanding_amount).toBe(0);
  });

  it('handles null items gracefully', () => {
    const result = fromErpPurchaseInvoice({ items: null });
    expect(result.items).toEqual([]);
  });

  it('handles items with missing fields', () => {
    const result = fromErpPurchaseInvoice({
      items: [{}],
    });
    const items = result.items as Record<string, unknown>[];
    expect(items).toHaveLength(1);
    expect(items[0].item_name).toBe('');
    expect(items[0].qty).toBe(0);
    expect(items[0].rate).toBe(0);
    expect(items[0].amount).toBe(0);
  });

  it('always sets erp_doctype to Purchase Invoice', () => {
    const result = fromErpPurchaseInvoice({});
    expect(result.erp_doctype).toBe('Purchase Invoice');
  });
});
