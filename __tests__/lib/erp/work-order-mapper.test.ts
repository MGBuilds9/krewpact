import { describe, expect, it } from 'vitest';

import { mapWorkOrderToErp, type WorkOrderMapInput } from '@/lib/erp/work-order-mapper';

function makeInput(overrides: Partial<WorkOrderMapInput> = {}): WorkOrderMapInput {
  return {
    id: 'wo-001',
    production_item: 'ASSY-001',
    item_name: 'Cable Assembly Kit',
    bom_no: 'BOM-ASSY-001-001',
    qty: 10,
    planned_start_date: '2026-04-01',
    expected_delivery_date: '2026-04-15',
    project_name: 'PRJ-MAIN-001',
    remarks: 'Urgent production run',
    ...overrides,
  };
}

describe('mapWorkOrderToErp', () => {
  it('maps all header fields correctly', () => {
    const result = mapWorkOrderToErp(makeInput());
    expect(result.naming_series).toBe('MFN-WO-.YYYY.-');
    expect(result.production_item).toBe('ASSY-001');
    expect(result.item_name).toBe('Cable Assembly Kit');
    expect(result.bom_no).toBe('BOM-ASSY-001-001');
    expect(result.qty).toBe(10);
    expect(result.planned_start_date).toBe('2026-04-01');
    expect(result.expected_delivery_date).toBe('2026-04-15');
    expect(result.currency).toBe('CAD');
    expect(result.krewpact_id).toBe('wo-001');
    expect(result.remarks).toBe('Urgent production run');
  });

  it('includes project when provided', () => {
    const result = mapWorkOrderToErp(makeInput());
    expect(result.project).toBe('PRJ-MAIN-001');
  });

  it('omits project when null', () => {
    const result = mapWorkOrderToErp(makeInput({ project_name: null }));
    expect(result).not.toHaveProperty('project');
  });

  it('defaults expected_delivery_date to planned_start_date when null', () => {
    const result = mapWorkOrderToErp(makeInput({ expected_delivery_date: null }));
    expect(result.expected_delivery_date).toBe('2026-04-01');
  });

  it('defaults remarks to empty string when null', () => {
    const result = mapWorkOrderToErp(makeInput({ remarks: null }));
    expect(result.remarks).toBe('');
  });
});
