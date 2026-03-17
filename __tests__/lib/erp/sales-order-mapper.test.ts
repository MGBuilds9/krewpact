import { describe, expect, it } from 'vitest';

import { mapWonDealToSalesOrder, type SalesOrderMapInput } from '@/lib/erp/sales-order-mapper';

function makeInput(overrides: Partial<SalesOrderMapInput> = {}): SalesOrderMapInput {
  return {
    opportunityId: 'opp-001',
    opportunityName: 'MDM Contracting - Office Reno',
    accountId: 'acct-001',
    estimatedRevenue: 150000,
    wonDate: '2026-03-01',
    ...overrides,
  };
}

describe('mapWonDealToSalesOrder', () => {
  it('maps basic fields correctly', () => {
    const result = mapWonDealToSalesOrder(makeInput());
    expect(result.doctype).toBe('Sales Order');
    expect(result.customer).toBe('acct-001');
    expect(result.transaction_date).toBe('2026-03-01');
    expect(result.delivery_date).toBe('2026-03-01');
    expect(result.currency).toBe('CAD');
    expect(result.krewpact_id).toBe('opp-001');
    expect(result.title).toBe('MDM Contracting - Office Reno');
  });

  it('creates a default single-line item when no items provided', () => {
    const result = mapWonDealToSalesOrder(makeInput());
    const items = result.items as Array<Record<string, unknown>>;
    expect(items).toHaveLength(1);
    expect(items[0]).toEqual({
      idx: 1,
      item_name: 'MDM Contracting - Office Reno',
      qty: 1,
      rate: 150000,
      amount: 150000,
    });
  });

  it('creates a default item with 0 amount when estimatedRevenue is null', () => {
    const result = mapWonDealToSalesOrder(makeInput({ estimatedRevenue: null }));
    const items = result.items as Array<Record<string, unknown>>;
    expect(items[0].rate).toBe(0);
    expect(items[0].amount).toBe(0);
  });

  it('maps provided line items with correct indices', () => {
    const result = mapWonDealToSalesOrder(
      makeInput({
        items: [
          { description: 'Labour', quantity: 100, rate: 85, amount: 8500 },
          { description: 'Materials', quantity: 50, rate: 200, amount: 10000 },
        ],
      }),
    );
    const items = result.items as Array<Record<string, unknown>>;
    expect(items).toHaveLength(2);
    expect(items[0]).toEqual({ idx: 1, item_name: 'Labour', qty: 100, rate: 85, amount: 8500 });
    expect(items[1]).toEqual({ idx: 2, item_name: 'Materials', qty: 50, rate: 200, amount: 10000 });
  });

  it('uses empty string for customer when accountId is null', () => {
    const result = mapWonDealToSalesOrder(makeInput({ accountId: null }));
    expect(result.customer).toBe('');
  });

  it('falls back to default item when items array is empty', () => {
    const result = mapWonDealToSalesOrder(makeInput({ items: [] }));
    const items = result.items as Array<Record<string, unknown>>;
    expect(items).toHaveLength(1);
    expect(items[0].item_name).toBe('MDM Contracting - Office Reno');
  });
});
