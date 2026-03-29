import { describe, expect, it } from 'vitest';

import {
  mapPurchaseReceiptToErp,
  type PurchaseReceiptMapInput,
} from '@/lib/erp/purchase-receipt-mapper';

function makeInput(overrides: Partial<PurchaseReceiptMapInput> = {}): PurchaseReceiptMapInput {
  return {
    id: 'gr-001',
    receipt_number: 'GR-2026-001',
    supplier_name: 'Premier Electrical Ltd.',
    posting_date: '2026-04-01',
    purchase_order_name: 'PUR-ORD-2026-001',
    items: [
      {
        item_code: 'CABLE-001',
        item_name: 'Copper Cable 12AWG',
        description: '12AWG copper cable, 1000ft spool',
        qty: 5,
        rate: 500,
        amount: 2500,
        uom: 'Spool',
        warehouse: 'Main Warehouse',
      },
    ],
    ...overrides,
  };
}

describe('mapPurchaseReceiptToErp', () => {
  it('maps all header fields correctly', () => {
    const result = mapPurchaseReceiptToErp(makeInput());
    expect(result.naming_series).toBe('MAT-PRE-.YYYY.-');
    expect(result.title).toBe('GR-2026-001');
    expect(result.supplier).toBe('Premier Electrical Ltd.');
    expect(result.posting_date).toBe('2026-04-01');
    expect(result.currency).toBe('CAD');
    expect(result.krewpact_id).toBe('gr-001');
    expect(result.purchase_order).toBe('PUR-ORD-2026-001');
  });

  it('maps item lines with sequential idx', () => {
    const result = mapPurchaseReceiptToErp(makeInput());
    const items = result.items as Record<string, unknown>[];
    expect(items).toHaveLength(1);
    expect(items[0].idx).toBe(1);
    expect(items[0].item_code).toBe('CABLE-001');
  });

  it('omits purchase_order when null', () => {
    const result = mapPurchaseReceiptToErp(makeInput({ purchase_order_name: null }));
    expect(result).not.toHaveProperty('purchase_order');
  });

  it('always sets currency to CAD', () => {
    const result = mapPurchaseReceiptToErp(makeInput());
    expect(result.currency).toBe('CAD');
  });
});
