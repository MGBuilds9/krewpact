import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  type CostCenterMapInput,
  fromErpCostCenter,
  mapCostCenterToErp,
} from '@/lib/erp/cost-center-mapper';

function makeInput(overrides: Partial<CostCenterMapInput> = {}): CostCenterMapInput {
  return {
    id: 'cc-001',
    cost_center_name: 'Contracting Division',
    parent_cost_center: 'MDM Group Inc. - MDM',
    company: 'MDM Group Inc.',
    is_group: false,
    ...overrides,
  };
}

describe('mapCostCenterToErp', () => {
  it('maps all fields correctly', () => {
    const result = mapCostCenterToErp(makeInput());
    expect(result.cost_center_name).toBe('Contracting Division');
    expect(result.parent_cost_center).toBe('MDM Group Inc. - MDM');
    expect(result.company).toBe('MDM Group Inc.');
    expect(result.is_group).toBe(0);
    expect(result.krewpact_id).toBe('cc-001');
  });

  it('defaults null parent to empty string', () => {
    const result = mapCostCenterToErp(makeInput({ parent_cost_center: null }));
    expect(result.parent_cost_center).toBe('');
  });

  it('maps is_group true to 1', () => {
    const result = mapCostCenterToErp(makeInput({ is_group: true }));
    expect(result.is_group).toBe(1);
  });
});

describe('fromErpCostCenter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-29T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('maps all fields from a fully populated cost center', () => {
    const result = fromErpCostCenter({
      name: 'Contracting - MDM',
      cost_center_name: 'Contracting',
      parent_cost_center: 'MDM Group Inc. - MDM',
      company: 'MDM Group Inc.',
      is_group: 0,
    });

    expect(result.erp_cost_center_name).toBe('Contracting - MDM');
    expect(result.erp_doctype).toBe('Cost Center');
    expect(result.cost_center_name).toBe('Contracting');
    expect(result.parent_cost_center).toBe('MDM Group Inc. - MDM');
    expect(result.is_group).toBe(false);
    expect(result.synced_at).toBe('2026-03-29T12:00:00.000Z');
  });

  it('handles missing fields gracefully', () => {
    const result = fromErpCostCenter({});
    expect(result.erp_cost_center_name).toBe('');
    expect(result.cost_center_name).toBe('');
    expect(result.parent_cost_center).toBe('');
    expect(result.company).toBe('');
    expect(result.is_group).toBe(false);
  });

  it('maps is_group = 1 to true', () => {
    const result = fromErpCostCenter({ is_group: 1 });
    expect(result.is_group).toBe(true);
  });
});
