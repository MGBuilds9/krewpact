import { describe, expect, it } from 'vitest';

import { mapPriceListToErp, type PriceListMapInput } from '@/lib/erp/price-list-mapper';

function makeInput(overrides: Partial<PriceListMapInput> = {}): PriceListMapInput {
  return {
    id: 'pl-001',
    price_list_name: 'Standard Buying',
    currency: 'CAD',
    buying: true,
    selling: false,
    enabled: true,
    ...overrides,
  };
}

describe('mapPriceListToErp', () => {
  it('maps all fields correctly', () => {
    const result = mapPriceListToErp(makeInput());
    expect(result.price_list_name).toBe('Standard Buying');
    expect(result.currency).toBe('CAD');
    expect(result.buying).toBe(1);
    expect(result.selling).toBe(0);
    expect(result.enabled).toBe(1);
    expect(result.krewpact_id).toBe('pl-001');
  });

  it('defaults currency to CAD when empty', () => {
    const result = mapPriceListToErp(makeInput({ currency: '' }));
    expect(result.currency).toBe('CAD');
  });

  it('sets buying to 0 when false', () => {
    const result = mapPriceListToErp(makeInput({ buying: false }));
    expect(result.buying).toBe(0);
  });

  it('sets selling to 1 when true', () => {
    const result = mapPriceListToErp(makeInput({ selling: true }));
    expect(result.selling).toBe(1);
  });

  it('sets enabled to 0 when false', () => {
    const result = mapPriceListToErp(makeInput({ enabled: false }));
    expect(result.enabled).toBe(0);
  });

  it('supports selling-only price list', () => {
    const result = mapPriceListToErp(
      makeInput({ buying: false, selling: true, price_list_name: 'Standard Selling' }),
    );
    expect(result.buying).toBe(0);
    expect(result.selling).toBe(1);
    expect(result.price_list_name).toBe('Standard Selling');
  });
});
