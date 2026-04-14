import { describe, expect, it } from 'vitest';

import { mapProjectToErp, type ProjectMapInput } from '@/lib/erp/project-mapper';

function makeInput(overrides: Partial<ProjectMapInput> = {}): ProjectMapInput {
  return {
    id: 'proj-001',
    project_number: 'PRJ-2026-001',
    project_name: 'MDM Contracting HQ Renovation',
    status: 'active',
    start_date: '2026-03-01',
    target_completion_date: '2026-09-01',
    baseline_budget: 500000,
    account_id: 'acct-001',
    division_id: 'div-contracting',
    ...overrides,
  };
}

describe('mapProjectToErp', () => {
  it('maps all fields correctly', () => {
    const result = mapProjectToErp(makeInput());
    expect(result.project_name).toBe('PRJ-2026-001 — MDM Contracting HQ Renovation');
    expect(result.status).toBe('Open');
    expect(result.expected_start_date).toBe('2026-03-01');
    expect(result.expected_end_date).toBe('2026-09-01');
    expect(result.estimated_costing).toBe(500000);
    expect(result.customer).toBe('acct-001');
    expect(result.currency).toBe('CAD');
    expect(result.krewpact_id).toBe('proj-001');
  });

  it('maps planning status to Open', () => {
    const result = mapProjectToErp(makeInput({ status: 'planning' }));
    expect(result.status).toBe('Open');
  });

  it('maps on_hold status to Hold', () => {
    const result = mapProjectToErp(makeInput({ status: 'on_hold' }));
    expect(result.status).toBe('Hold');
  });

  it('maps completed status to Completed', () => {
    const result = mapProjectToErp(makeInput({ status: 'completed' }));
    expect(result.status).toBe('Completed');
  });

  it('maps cancelled status to Cancelled', () => {
    const result = mapProjectToErp(makeInput({ status: 'cancelled' }));
    expect(result.status).toBe('Cancelled');
  });

  it('defaults unknown status to Open', () => {
    const result = mapProjectToErp(makeInput({ status: 'unknown_status' }));
    expect(result.status).toBe('Open');
  });

  it('defaults estimated_costing to 0 when baseline_budget is null', () => {
    const result = mapProjectToErp(makeInput({ baseline_budget: null }));
    expect(result.estimated_costing).toBe(0);
  });

  it('omits customer when account_id is null (empty string fails link validation)', () => {
    const result = mapProjectToErp(makeInput({ account_id: null }));
    expect(result).not.toHaveProperty('customer');
  });

  it('omits department — ERPNext rejects Supabase UUIDs on the Department link', () => {
    const result = mapProjectToErp(makeInput({ division_id: 'div-any-value' }));
    expect(result).not.toHaveProperty('department');
  });

  it('always sets currency to CAD', () => {
    const result = mapProjectToErp(makeInput());
    expect(result.currency).toBe('CAD');
  });
});
