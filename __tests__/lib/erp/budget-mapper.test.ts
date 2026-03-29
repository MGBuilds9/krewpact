import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  type BudgetMapInput,
  fromErpBudget,
  mapBudgetToErp,
} from '@/lib/erp/budget-mapper';

function makeInput(overrides: Partial<BudgetMapInput> = {}): BudgetMapInput {
  return {
    id: 'bdg-001',
    budget_against: 'Cost Center',
    company: 'MDM Group Inc.',
    fiscal_year: '2026',
    cost_center: 'Contracting - MDM',
    project: null,
    monthly_distribution: null,
    applicable_on_material_request: true,
    applicable_on_purchase_order: true,
    action_if_annual_budget_exceeded: 'Warn',
    accounts: [
      {
        account: '5100 - Cost of Goods Sold - MDM',
        budget_amount: 500000,
      },
      {
        account: '5200 - Labour Cost - MDM',
        budget_amount: 300000,
      },
    ],
    ...overrides,
  };
}

describe('mapBudgetToErp', () => {
  it('maps all header fields correctly', () => {
    const result = mapBudgetToErp(makeInput());
    expect(result.naming_series).toBe('BDG-.YYYY.-');
    expect(result.budget_against).toBe('Cost Center');
    expect(result.company).toBe('MDM Group Inc.');
    expect(result.fiscal_year).toBe('2026');
    expect(result.cost_center).toBe('Contracting - MDM');
    expect(result.applicable_on_material_request).toBe(1);
    expect(result.applicable_on_purchase_order).toBe(1);
    expect(result.action_if_annual_budget_exceeded).toBe('Warn');
    expect(result.krewpact_id).toBe('bdg-001');
  });

  it('maps account lines with sequential idx', () => {
    const result = mapBudgetToErp(makeInput());
    const accounts = result.accounts as Record<string, unknown>[];
    expect(accounts).toHaveLength(2);
    expect(accounts[0].idx).toBe(1);
    expect(accounts[0].account).toBe('5100 - Cost of Goods Sold - MDM');
    expect(accounts[0].budget_amount).toBe(500000);
    expect(accounts[1].idx).toBe(2);
    expect(accounts[1].budget_amount).toBe(300000);
  });

  it('defaults null fields correctly', () => {
    const result = mapBudgetToErp(
      makeInput({ project: null, cost_center: null, monthly_distribution: null }),
    );
    expect(result.project).toBe('');
    expect(result.cost_center).toBe('');
    expect(result.monthly_distribution).toBe('');
  });

  it('defaults budget_against when empty', () => {
    const result = mapBudgetToErp(makeInput({ budget_against: '' }));
    expect(result.budget_against).toBe('Cost Center');
  });

  it('maps false booleans to 0', () => {
    const result = mapBudgetToErp(
      makeInput({
        applicable_on_material_request: false,
        applicable_on_purchase_order: false,
      }),
    );
    expect(result.applicable_on_material_request).toBe(0);
    expect(result.applicable_on_purchase_order).toBe(0);
  });
});

describe('fromErpBudget', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-29T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('maps all fields from a fully populated budget', () => {
    const result = fromErpBudget({
      name: 'BDG-2026-001',
      budget_against: 'Cost Center',
      company: 'MDM Group Inc.',
      fiscal_year: '2026',
      cost_center: 'Contracting - MDM',
      project: '',
      monthly_distribution: 'Even Distribution',
      action_if_annual_budget_exceeded: 'Warn',
      accounts: [
        { account: '5100 - COGS - MDM', budget_amount: 500000 },
      ],
    });

    expect(result.erp_budget_name).toBe('BDG-2026-001');
    expect(result.erp_doctype).toBe('Budget');
    expect(result.budget_against).toBe('Cost Center');
    expect(result.fiscal_year).toBe('2026');
    expect(result.monthly_distribution).toBe('Even Distribution');
    const accounts = result.accounts as Record<string, unknown>[];
    expect(accounts).toHaveLength(1);
    expect(accounts[0].budget_amount).toBe(500000);
    expect(result.synced_at).toBe('2026-03-29T12:00:00.000Z');
  });

  it('handles missing fields gracefully', () => {
    const result = fromErpBudget({});
    expect(result.erp_budget_name).toBe('');
    expect(result.budget_against).toBe('');
    expect(result.fiscal_year).toBe('');
    expect(result.accounts).toEqual([]);
  });

  it('handles non-numeric budget_amount gracefully', () => {
    const result = fromErpBudget({
      accounts: [{ account: 'test', budget_amount: 'not-a-number' }],
    });
    const accounts = result.accounts as Record<string, unknown>[];
    expect(accounts[0].budget_amount).toBe(0);
  });

  it('handles null accounts gracefully', () => {
    const result = fromErpBudget({ accounts: null });
    expect(result.accounts).toEqual([]);
  });
});
