import { describe, expect, it } from 'vitest';

import { type DepartmentMapInput, mapDepartmentToErp } from '@/lib/erp/department-mapper';

function makeInput(overrides: Partial<DepartmentMapInput> = {}): DepartmentMapInput {
  return {
    id: 'div-001',
    department_name: 'MDM Contracting',
    company: 'MDM Group Inc.',
    parent_department: null,
    is_group: false,
    ...overrides,
  };
}

describe('mapDepartmentToErp', () => {
  it('maps all fields correctly', () => {
    const result = mapDepartmentToErp(makeInput());
    expect(result.name).toBe('MDM Contracting');
    expect(result.department_name).toBe('MDM Contracting');
    expect(result.company).toBe('MDM Group Inc.');
    expect(result.parent_department).toBe('');
    expect(result.is_group).toBe(0);
    expect(result.krewpact_id).toBe('div-001');
  });

  it('includes parent_department when provided', () => {
    const result = mapDepartmentToErp(
      makeInput({ parent_department: 'All Departments' }),
    );
    expect(result.parent_department).toBe('All Departments');
  });

  it('sets is_group to 1 when true', () => {
    const result = mapDepartmentToErp(makeInput({ is_group: true }));
    expect(result.is_group).toBe(1);
  });
});
