import { describe, expect, it } from 'vitest';

import { type BidInput, type BidLineInput, toErpSupplierQuotation } from '@/lib/erp/bid-mapper';

function makeBid(overrides: Partial<BidInput> = {}): BidInput {
  return {
    id: 'bid-001',
    rfq_id: 'rfq-001',
    supplier_name: 'Apex Electrical Inc.',
    erp_supplier_name: null,
    total_amount: 6250.0,
    scope_summary: 'Supply of all electrical materials as per RFQ-2026-0015.',
    notes: 'Prices valid for 30 days. Delivery within 2 weeks.',
    currency_code: 'CAD',
    submitted_at: '2026-04-10T09:00:00Z',
    ...overrides,
  };
}

function makeLines(): BidLineInput[] {
  return [
    {
      description: 'Cable Tray 100mm',
      quantity: 50,
      unit: 'm',
      unit_price: 20.0,
      line_total: 1000.0,
    },
    {
      description: 'Steel Conduit 25mm',
      quantity: 200,
      unit: 'm',
      unit_price: 7.5,
      line_total: 1500.0,
    },
  ];
}

describe('toErpSupplierQuotation', () => {
  it('maps all bid header fields correctly', () => {
    const result = toErpSupplierQuotation(makeBid(), makeLines());
    expect(result.supplier).toBe('Apex Electrical Inc.');
    expect(result.currency).toBe('CAD');
    expect(result.transaction_date).toBe('2026-04-10');
    expect(result.terms).toBe('Prices valid for 30 days. Delivery within 2 weeks.');
    expect(result.custom_mdm_bid_id).toBe('bid-001');
    expect(result.custom_mdm_rfq_id).toBe('rfq-001');
  });

  it('prefers erp_supplier_name over supplier_name', () => {
    const result = toErpSupplierQuotation(
      makeBid({ erp_supplier_name: 'SUPP-00042' }),
      makeLines(),
    );
    expect(result.supplier).toBe('SUPP-00042');
  });

  it('falls back to supplier_name when erp_supplier_name is null', () => {
    const result = toErpSupplierQuotation(makeBid({ erp_supplier_name: null }), makeLines());
    expect(result.supplier).toBe('Apex Electrical Inc.');
  });

  it('defaults supplier to empty string when both names are null', () => {
    const result = toErpSupplierQuotation(
      makeBid({ erp_supplier_name: null, supplier_name: null }),
      makeLines(),
    );
    expect(result.supplier).toBe('');
  });

  it('defaults currency to CAD when null', () => {
    const result = toErpSupplierQuotation(makeBid({ currency_code: null }), makeLines());
    expect(result.currency).toBe('CAD');
  });

  it('maps line items correctly', () => {
    const result = toErpSupplierQuotation(makeBid(), makeLines());
    const items = result.items as Record<string, unknown>[];
    expect(items).toHaveLength(2);
    expect(items[0].item_code).toBe('Cable Tray 100mm');
    expect(items[0].item_name).toBe('Cable Tray 100mm');
    expect(items[0].qty).toBe(50);
    expect(items[0].rate).toBe(20.0);
    expect(items[0].amount).toBe(1000.0);
    expect(items[0].uom).toBe('m');
    expect(items[0].idx).toBe(1);
    expect(items[1].idx).toBe(2);
    expect(items[1].item_code).toBe('Steel Conduit 25mm');
  });

  it('prefers item_code when provided over description fallback', () => {
    const result = toErpSupplierQuotation(makeBid(), [
      {
        item_code: 'ELEC-CT-100',
        description: 'Cable Tray 100mm',
        quantity: 10,
        unit: 'm',
        unit_price: 20,
        line_total: 200,
      },
    ]);
    const items = result.items as Record<string, unknown>[];
    expect(items[0].item_code).toBe('ELEC-CT-100');
  });

  it('generates ITEM-N fallback when description is empty', () => {
    const result = toErpSupplierQuotation(makeBid(), [
      { description: '', quantity: 1, unit: null, unit_price: 0, line_total: 0 },
    ]);
    const items = result.items as Record<string, unknown>[];
    expect(items[0].item_code).toBe('ITEM-1');
  });

  it('calculates net_total and grand_total from line totals', () => {
    const result = toErpSupplierQuotation(makeBid(), makeLines());
    expect(result.net_total).toBe(2500.0);
    expect(result.grand_total).toBe(2500.0);
  });

  it('handles empty lines array', () => {
    const result = toErpSupplierQuotation(makeBid(), []);
    expect(result.items).toEqual([]);
    expect(result.net_total).toBe(0);
    expect(result.grand_total).toBe(0);
  });

  it('defaults rfq_id to empty string when null', () => {
    const result = toErpSupplierQuotation(makeBid({ rfq_id: null }), makeLines());
    expect(result.custom_mdm_rfq_id).toBe('');
  });

  it('falls back to scope_summary when notes is null', () => {
    const result = toErpSupplierQuotation(makeBid({ notes: null }), makeLines());
    expect(result.terms).toBe('Supply of all electrical materials as per RFQ-2026-0015.');
  });

  it('defaults terms to empty string when both notes and scope_summary are null', () => {
    const result = toErpSupplierQuotation(
      makeBid({ notes: null, scope_summary: null }),
      makeLines(),
    );
    expect(result.terms).toBe('');
  });

  it('uses today as transaction_date when submitted_at is null', () => {
    const today = new Date().toISOString().slice(0, 10);
    const result = toErpSupplierQuotation(makeBid({ submitted_at: null }), makeLines());
    expect(result.transaction_date).toBe(today);
  });

  it('defaults uom to Nos when unit is null', () => {
    const result = toErpSupplierQuotation(makeBid(), [
      { description: 'Misc Part', quantity: 3, unit: null, unit_price: 50, line_total: 150 },
    ]);
    const items = result.items as Record<string, unknown>[];
    expect(items[0].uom).toBe('Nos');
  });
});
