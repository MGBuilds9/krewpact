import { describe, expect, it } from 'vitest';

import {
  mapMaterialRequestToErp,
  type MaterialRequestMapInput,
} from '@/lib/erp/material-request-mapper';

function makeInput(overrides: Partial<MaterialRequestMapInput> = {}): MaterialRequestMapInput {
  return {
    id: 'mr-001',
    request_number: 'MR-2026-001',
    request_type: 'Purchase',
    transaction_date: '2026-03-29',
    required_by_date: '2026-04-10',
    project_name: 'PRJ-MAIN-001',
    items: [
      {
        item_code: 'CABLE-001',
        item_name: 'Copper Cable 12AWG',
        description: '12AWG copper cable',
        qty: 50,
        uom: 'Spool',
        warehouse: 'Main Warehouse',
      },
    ],
    ...overrides,
  };
}

describe('mapMaterialRequestToErp', () => {
  it('maps all header fields correctly', () => {
    const result = mapMaterialRequestToErp(makeInput());
    expect(result.naming_series).toBe('MAT-MR-.YYYY.-');
    expect(result.title).toBe('MR-2026-001');
    expect(result.material_request_type).toBe('Purchase');
    expect(result.transaction_date).toBe('2026-03-29');
    expect(result.schedule_date).toBe('2026-04-10');
    expect(result.krewpact_id).toBe('mr-001');
  });

  it('includes project when provided', () => {
    const result = mapMaterialRequestToErp(makeInput());
    expect(result.project).toBe('PRJ-MAIN-001');
  });

  it('omits project when null', () => {
    const result = mapMaterialRequestToErp(makeInput({ project_name: null }));
    expect(result).not.toHaveProperty('project');
  });

  it('defaults schedule_date to transaction_date when required_by_date is null', () => {
    const result = mapMaterialRequestToErp(makeInput({ required_by_date: null }));
    expect(result.schedule_date).toBe('2026-03-29');
  });

  it('maps item lines with sequential idx', () => {
    const result = mapMaterialRequestToErp(makeInput());
    const items = result.items as Record<string, unknown>[];
    expect(items).toHaveLength(1);
    expect(items[0].idx).toBe(1);
    expect(items[0].qty).toBe(50);
    expect(items[0].schedule_date).toBe('2026-04-10');
  });

  it('supports Material Transfer type', () => {
    const result = mapMaterialRequestToErp(makeInput({ request_type: 'Material Transfer' }));
    expect(result.material_request_type).toBe('Material Transfer');
  });
});
