import { describe, expect, it } from 'vitest';

import { mapStockEntryToErp, type StockEntryMapInput } from '@/lib/erp/stock-entry-mapper';

function makeInput(overrides: Partial<StockEntryMapInput> = {}): StockEntryMapInput {
  return {
    id: 'ste-001',
    entry_type: 'Material Receipt',
    posting_date: '2026-03-29',
    posting_time: '14:30:00',
    project_name: 'PRJ-MAIN-001',
    remarks: 'Received from supplier',
    items: [
      {
        item_code: 'CABLE-001',
        item_name: 'Copper Cable 12AWG',
        description: '12AWG copper cable',
        qty: 10,
        uom: 'Spool',
        basic_rate: 500,
        source_warehouse: null,
        target_warehouse: 'Main Warehouse',
      },
    ],
    ...overrides,
  };
}

describe('mapStockEntryToErp', () => {
  it('maps all header fields correctly', () => {
    const result = mapStockEntryToErp(makeInput());
    expect(result.naming_series).toBe('MAT-STE-.YYYY.-');
    expect(result.stock_entry_type).toBe('Material Receipt');
    expect(result.posting_date).toBe('2026-03-29');
    expect(result.posting_time).toBe('14:30:00');
    expect(result.currency).toBe('CAD');
    expect(result.krewpact_id).toBe('ste-001');
    expect(result.remarks).toBe('Received from supplier');
  });

  it('includes project when provided', () => {
    const result = mapStockEntryToErp(makeInput());
    expect(result.project).toBe('PRJ-MAIN-001');
  });

  it('omits project when null', () => {
    const result = mapStockEntryToErp(makeInput({ project_name: null }));
    expect(result).not.toHaveProperty('project');
  });

  it('defaults posting_time to 00:00:00 when null', () => {
    const result = mapStockEntryToErp(makeInput({ posting_time: null }));
    expect(result.posting_time).toBe('00:00:00');
  });

  it('defaults remarks to empty string when null', () => {
    const result = mapStockEntryToErp(makeInput({ remarks: null }));
    expect(result.remarks).toBe('');
  });

  it('maps item lines with warehouse fields', () => {
    const result = mapStockEntryToErp(makeInput());
    const items = result.items as Record<string, unknown>[];
    expect(items).toHaveLength(1);
    expect(items[0].idx).toBe(1);
    expect(items[0].s_warehouse).toBe('');
    expect(items[0].t_warehouse).toBe('Main Warehouse');
    expect(items[0].basic_rate).toBe(500);
  });

  it('supports Material Transfer type with both warehouses', () => {
    const result = mapStockEntryToErp(
      makeInput({
        entry_type: 'Material Transfer',
        items: [
          {
            item_code: 'CABLE-001',
            item_name: 'Copper Cable 12AWG',
            description: 'Transfer stock',
            qty: 5,
            uom: 'Spool',
            basic_rate: 500,
            source_warehouse: 'Main Warehouse',
            target_warehouse: 'Site Warehouse',
          },
        ],
      }),
    );
    const items = result.items as Record<string, unknown>[];
    expect(items[0].s_warehouse).toBe('Main Warehouse');
    expect(items[0].t_warehouse).toBe('Site Warehouse');
  });
});
