import { describe, it, expect } from 'vitest';
import { mapExpenseToErp, type ExpenseMapInput } from '@/lib/erp/expense-mapper';

function makeInput(overrides: Partial<ExpenseMapInput> = {}): ExpenseMapInput {
  return {
    id: 'exp-001',
    user_id: 'user-001',
    project_id: 'proj-001',
    amount: 250.0,
    tax_amount: 32.5,
    category: 'materials',
    description: 'Lumber for framing',
    expense_date: '2026-02-10',
    currency_code: 'CAD',
    ...overrides,
  };
}

describe('mapExpenseToErp', () => {
  it('maps all fields correctly', () => {
    const result = mapExpenseToErp(makeInput());
    expect(result.employee).toBe('user-001');
    expect(result.posting_date).toBe('2026-02-10');
    expect(result.currency).toBe('CAD');
    expect(result.total_claimed_amount).toBe(250.0);
    expect(result.total_sanctioned_amount).toBe(250.0);
    expect(result.project).toBe('proj-001');
    expect(result.krewpact_id).toBe('exp-001');
  });

  it('creates a single expense line item', () => {
    const result = mapExpenseToErp(makeInput());
    const expenses = result.expenses as Record<string, unknown>[];
    expect(expenses).toHaveLength(1);
    expect(expenses[0].expense_type).toBe('materials');
    expect(expenses[0].description).toBe('Lumber for framing');
    expect(expenses[0].amount).toBe(250.0);
    expect(expenses[0].tax_amount).toBe(32.5);
  });

  it('defaults currency to CAD when currency_code is null', () => {
    const result = mapExpenseToErp(makeInput({ currency_code: null }));
    expect(result.currency).toBe('CAD');
  });

  it('defaults project to empty string when project_id is null', () => {
    const result = mapExpenseToErp(makeInput({ project_id: null }));
    expect(result.project).toBe('');
  });

  it('defaults expense_type to General when category is null', () => {
    const result = mapExpenseToErp(makeInput({ category: null }));
    const expenses = result.expenses as Record<string, unknown>[];
    expect(expenses[0].expense_type).toBe('General');
  });

  it('defaults description to empty string when null', () => {
    const result = mapExpenseToErp(makeInput({ description: null }));
    const expenses = result.expenses as Record<string, unknown>[];
    expect(expenses[0].description).toBe('');
  });

  it('defaults tax_amount to 0 in line item when null', () => {
    const result = mapExpenseToErp(makeInput({ tax_amount: null }));
    const expenses = result.expenses as Record<string, unknown>[];
    expect(expenses[0].tax_amount).toBe(0);
  });

  it('sets claimed and sanctioned amounts equal to input amount', () => {
    const result = mapExpenseToErp(makeInput({ amount: 1500.0 }));
    expect(result.total_claimed_amount).toBe(1500.0);
    expect(result.total_sanctioned_amount).toBe(1500.0);
  });
});
