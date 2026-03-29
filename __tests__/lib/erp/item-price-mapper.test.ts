import { describe, expect, it } from 'vitest';

import { type ItemPriceMapInput, mapItemPriceToErp } from '@/lib/erp/item-price-mapper';

function makeInput(overrides: Partial<ItemPriceMapInput> = {}): ItemPriceMapInput {
  return {
    id: 'ip-001',
    item_code: 'CABLE-001',
    item_name: 'Copper Cable 12AWG',
    price_list: 'Standard Buying',
    price_list_rate: 50.0,
    currency: 'CAD',
    uom: 'Spool',
    min_qty: 1,
    valid_from: '2026-01-01',
    valid_upto: '2026-12-31',
    ...overrides,
  };
}

describe('mapItemPriceToErp', () => {
  it('maps all fields correctly', () => {
    const result = mapItemPriceToErp(makeInput());
    expect(result.item_code).toBe('CABLE-001');
    expect(result.item_name).toBe('Copper Cable 12AWG');
    expect(result.price_list).toBe('Standard Buying');
    expect(result.price_list_rate).toBe(50.0);
    expect(result.currency).toBe('CAD');
    expect(result.uom).toBe('Spool');
    expect(result.min_qty).toBe(1);
    expect(result.krewpact_id).toBe('ip-001');
    expect(result.valid_from).toBe('2026-01-01');
    expect(result.valid_upto).toBe('2026-12-31');
  });

  it('defaults currency to CAD when empty', () => {
    const result = mapItemPriceToErp(makeInput({ currency: '' }));
    expect(result.currency).toBe('CAD');
  });

  it('defaults uom to Nos when null', () => {
    const result = mapItemPriceToErp(makeInput({ uom: null }));
    expect(result.uom).toBe('Nos');
  });

  it('omits valid_from when null', () => {
    const result = mapItemPriceToErp(makeInput({ valid_from: null }));
    expect(result).not.toHaveProperty('valid_from');
  });

  it('omits valid_upto when null', () => {
    const result = mapItemPriceToErp(makeInput({ valid_upto: null }));
    expect(result).not.toHaveProperty('valid_upto');
  });

  it('includes both validity dates when provided', () => {
    const result = mapItemPriceToErp(makeInput());
    expect(result.valid_from).toBe('2026-01-01');
    expect(result.valid_upto).toBe('2026-12-31');
  });
});
