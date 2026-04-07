import { describe, expect, it } from 'vitest';

import { mapPurchaseOrderToErp, type PurchaseOrderMapInput } from '@/lib/erp/purchase-order-mapper';

function makeInput(overrides: Partial<PurchaseOrderMapInput> = {}): PurchaseOrderMapInput {
  return {
    id: 'po-001',
    po_number: 'PO-2026-001',
    supplier_name: 'Premier Electrical Ltd.',
    order_date: '2026-03-29',
    expected_delivery_date: '2026-04-15',
    currency: 'CAD',
    total_amount: 25000,
    notes: 'Urgent delivery required',
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

describe('mapPurchaseOrderToErp', () => {
  it('maps all header fields correctly', () => {
    const result = mapPurchaseOrderToErp(makeInput());
    expect(result.naming_series).toBe('PUR-ORD-.YYYY.-');
    expect(result.title).toBe('PO-2026-001');
    expect(result.supplier).toBe('Premier Electrical Ltd.');
    expect(result.transaction_date).toBe('2026-03-29');
    expect(result.schedule_date).toBe('2026-04-15');
    expect(result.currency).toBe('CAD');
    expect(result.grand_total).toBe(25000);
    expect(result.krewpact_id).toBe('po-001');
  });

  it('maps item lines with sequential idx', () => {
    const result = mapPurchaseOrderToErp(makeInput());
    const items = result.items as Record<string, unknown>[];
    expect(items).toHaveLength(1);
    expect(items[0].idx).toBe(1);
    expect(items[0].item_code).toBe('CABLE-001');
    expect(items[0].qty).toBe(5);
    expect(items[0].rate).toBe(500);
  });

  it('defaults schedule_date to order_date when delivery date is null', () => {
    const result = mapPurchaseOrderToErp(makeInput({ expected_delivery_date: null }));
    expect(result.schedule_date).toBe('2026-03-29');
  });

  it('defaults remarks to empty string when notes is null', () => {
    const result = mapPurchaseOrderToErp(makeInput({ notes: null }));
    expect(result.remarks).toBe('');
  });

  it('defaults currency to CAD', () => {
    const result = mapPurchaseOrderToErp(makeInput({ currency: '' }));
    expect(result.currency).toBe('CAD');
  });

  it('always sets buying_price_list to Standard Buying', () => {
    const result = mapPurchaseOrderToErp(makeInput());
    expect(result.buying_price_list).toBe('Standard Buying');
  });
});
