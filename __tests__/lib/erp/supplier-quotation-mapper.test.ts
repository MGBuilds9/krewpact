import { describe, expect, it } from 'vitest';

import {
  mapSupplierQuotationToErp,
  type SupplierQuotationMapInput,
} from '@/lib/erp/supplier-quotation-mapper';

function makeInput(overrides: Partial<SupplierQuotationMapInput> = {}): SupplierQuotationMapInput {
  return {
    id: 'sq-001',
    quotation_number: 'SQ-2026-001',
    supplier_name: 'Premier Electrical Ltd.',
    transaction_date: '2026-03-29',
    valid_till: '2026-04-29',
    currency: 'CAD',
    total_amount: 15000,
    items: [
      {
        item_code: 'CABLE-001',
        item_name: 'Copper Cable 12AWG',
        description: '12AWG copper cable',
        qty: 10,
        rate: 150,
        amount: 1500,
        uom: 'Spool',
      },
    ],
    ...overrides,
  };
}

describe('mapSupplierQuotationToErp', () => {
  it('maps all header fields correctly', () => {
    const result = mapSupplierQuotationToErp(makeInput());
    expect(result.naming_series).toBe('SQTN-.YYYY.-');
    expect(result.title).toBe('SQ-2026-001');
    expect(result.supplier).toBe('Premier Electrical Ltd.');
    expect(result.transaction_date).toBe('2026-03-29');
    expect(result.valid_till).toBe('2026-04-29');
    expect(result.grand_total).toBe(15000);
    expect(result.krewpact_id).toBe('sq-001');
  });

  it('maps item lines with sequential idx', () => {
    const result = mapSupplierQuotationToErp(makeInput());
    const items = result.items as Record<string, unknown>[];
    expect(items).toHaveLength(1);
    expect(items[0].idx).toBe(1);
    expect(items[0].item_code).toBe('CABLE-001');
  });

  it('sets valid_till to null when not provided', () => {
    const result = mapSupplierQuotationToErp(makeInput({ valid_till: null }));
    expect(result.valid_till).toBeNull();
  });

  it('defaults currency to CAD', () => {
    const result = mapSupplierQuotationToErp(makeInput({ currency: '' }));
    expect(result.currency).toBe('CAD');
  });
});
