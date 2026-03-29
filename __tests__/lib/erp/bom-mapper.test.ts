import { describe, expect, it } from 'vitest';

import { type BomMapInput, mapBomToErp } from '@/lib/erp/bom-mapper';

function makeInput(overrides: Partial<BomMapInput> = {}): BomMapInput {
  return {
    id: 'bom-001',
    item_code: 'ASSY-001',
    item_name: 'Cable Assembly Kit',
    quantity: 1,
    is_active: true,
    is_default: true,
    currency: 'CAD',
    remarks: 'Standard assembly BOM',
    items: [
      {
        item_code: 'CABLE-001',
        item_name: 'Copper Cable 12AWG',
        description: '12AWG copper cable',
        qty: 10,
        uom: 'Meter',
        rate: 50,
        amount: 500,
        source_warehouse: 'Main Warehouse',
      },
    ],
    ...overrides,
  };
}

describe('mapBomToErp', () => {
  it('maps all header fields correctly', () => {
    const result = mapBomToErp(makeInput());
    expect(result.item).toBe('ASSY-001');
    expect(result.item_name).toBe('Cable Assembly Kit');
    expect(result.quantity).toBe(1);
    expect(result.is_active).toBe(1);
    expect(result.is_default).toBe(1);
    expect(result.currency).toBe('CAD');
    expect(result.krewpact_id).toBe('bom-001');
    expect(result.remarks).toBe('Standard assembly BOM');
  });

  it('sets is_active to 0 when false', () => {
    const result = mapBomToErp(makeInput({ is_active: false }));
    expect(result.is_active).toBe(0);
  });

  it('sets is_default to 0 when false', () => {
    const result = mapBomToErp(makeInput({ is_default: false }));
    expect(result.is_default).toBe(0);
  });

  it('defaults currency to CAD when empty', () => {
    const result = mapBomToErp(makeInput({ currency: '' }));
    expect(result.currency).toBe('CAD');
  });

  it('defaults remarks to empty string when null', () => {
    const result = mapBomToErp(makeInput({ remarks: null }));
    expect(result.remarks).toBe('');
  });

  it('maps item lines with sequential idx', () => {
    const result = mapBomToErp(makeInput());
    const items = result.items as Record<string, unknown>[];
    expect(items).toHaveLength(1);
    expect(items[0].idx).toBe(1);
    expect(items[0].item_code).toBe('CABLE-001');
    expect(items[0].qty).toBe(10);
    expect(items[0].rate).toBe(50);
    expect(items[0].amount).toBe(500);
    expect(items[0].source_warehouse).toBe('Main Warehouse');
  });

  it('defaults item uom to Nos when empty', () => {
    const result = mapBomToErp(
      makeInput({
        items: [
          {
            item_code: 'CABLE-001',
            item_name: 'Cable',
            description: 'Cable',
            qty: 1,
            uom: '',
            rate: 10,
            amount: 10,
            source_warehouse: null,
          },
        ],
      }),
    );
    const items = result.items as Record<string, unknown>[];
    expect(items[0].uom).toBe('Nos');
    expect(items[0].source_warehouse).toBe('');
  });
});
