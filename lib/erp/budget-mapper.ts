/**
 * Maps KrewPact budget data to/from ERPNext Budget doctype format.
 * Pure function — no side effects or database calls.
 */

export interface BudgetMapInput {
  id: string;
  budget_against: string;
  company: string;
  fiscal_year: string;
  cost_center: string | null;
  project: string | null;
  monthly_distribution: string | null;
  applicable_on_material_request: boolean;
  applicable_on_purchase_order: boolean;
  action_if_annual_budget_exceeded: string;
  accounts: BudgetAccountInput[];
}

export interface BudgetAccountInput {
  account: string;
  budget_amount: number;
}

/**
 * Map a KrewPact budget to an ERPNext Budget document.
 */
export function mapBudgetToErp(
  budget: BudgetMapInput,
): Record<string, unknown> {
  return {
    naming_series: 'BDG-.YYYY.-',
    budget_against: budget.budget_against || 'Cost Center',
    company: budget.company,
    fiscal_year: budget.fiscal_year,
    cost_center: budget.cost_center || '',
    project: budget.project || '',
    monthly_distribution: budget.monthly_distribution || '',
    applicable_on_material_request: budget.applicable_on_material_request ? 1 : 0,
    applicable_on_purchase_order: budget.applicable_on_purchase_order ? 1 : 0,
    action_if_annual_budget_exceeded: budget.action_if_annual_budget_exceeded || 'Warn',
    krewpact_id: budget.id,
    accounts: budget.accounts.map((acct, idx) => ({
      idx: idx + 1,
      account: acct.account,
      budget_amount: acct.budget_amount,
    })),
  };
}

/**
 * Map an ERPNext Budget document to a KrewPact record.
 */
export function fromErpBudget(
  erpBudget: Record<string, unknown>,
): Record<string, unknown> {
  return {
    erp_budget_name: erpBudget.name || '',
    erp_doctype: 'Budget',
    budget_against: erpBudget.budget_against || '',
    company: erpBudget.company || '',
    fiscal_year: erpBudget.fiscal_year || '',
    cost_center: erpBudget.cost_center || '',
    project: erpBudget.project || '',
    monthly_distribution: erpBudget.monthly_distribution || '',
    action_if_annual_budget_exceeded:
      erpBudget.action_if_annual_budget_exceeded || 'Warn',
    accounts: Array.isArray(erpBudget.accounts)
      ? (erpBudget.accounts as Record<string, unknown>[]).map((acct) => ({
          account: acct.account || '',
          budget_amount: typeof acct.budget_amount === 'number' ? acct.budget_amount : 0,
        }))
      : [],
    synced_at: new Date().toISOString(),
  };
}
