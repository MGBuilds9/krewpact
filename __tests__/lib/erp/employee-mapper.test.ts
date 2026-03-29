import { describe, expect, it } from 'vitest';

import { type EmployeeMapInput, mapEmployeeToErp } from '@/lib/erp/employee-mapper';

function makeInput(overrides: Partial<EmployeeMapInput> = {}): EmployeeMapInput {
  return {
    id: 'user-001',
    employee_name: 'John Smith',
    first_name: 'John',
    last_name: 'Smith',
    email: 'john@example.com',
    date_of_joining: '2026-01-15',
    date_of_birth: '1990-06-01',
    gender: 'Male',
    company: 'MDM Group Inc.',
    department: 'MDM Contracting',
    designation: 'Project Manager',
    status: 'Active',
    ...overrides,
  };
}

describe('mapEmployeeToErp', () => {
  it('maps all fields correctly', () => {
    const result = mapEmployeeToErp(makeInput());
    expect(result.naming_series).toBe('HR-EMP-.YYYY.-');
    expect(result.employee_name).toBe('John Smith');
    expect(result.first_name).toBe('John');
    expect(result.last_name).toBe('Smith');
    expect(result.company_email).toBe('john@example.com');
    expect(result.date_of_joining).toBe('2026-01-15');
    expect(result.date_of_birth).toBe('1990-06-01');
    expect(result.gender).toBe('Male');
    expect(result.company).toBe('MDM Group Inc.');
    expect(result.department).toBe('MDM Contracting');
    expect(result.designation).toBe('Project Manager');
    expect(result.status).toBe('Active');
    expect(result.krewpact_user_id).toBe('user-001');
  });

  it('defaults gender to Prefer not to say when null', () => {
    const result = mapEmployeeToErp(makeInput({ gender: null }));
    expect(result.gender).toBe('Prefer not to say');
  });

  it('defaults department to empty string when null', () => {
    const result = mapEmployeeToErp(makeInput({ department: null }));
    expect(result.department).toBe('');
  });

  it('defaults designation to empty string when null', () => {
    const result = mapEmployeeToErp(makeInput({ designation: null }));
    expect(result.designation).toBe('');
  });

  it('defaults date_of_birth to empty string when null', () => {
    const result = mapEmployeeToErp(makeInput({ date_of_birth: null }));
    expect(result.date_of_birth).toBe('');
  });

  it('defaults last_name to empty string when empty', () => {
    const result = mapEmployeeToErp(makeInput({ last_name: '' }));
    expect(result.last_name).toBe('');
  });
});
