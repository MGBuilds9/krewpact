/**
 * Maps KrewPact expense claim data to ERPNext Expense Claim doctype format.
 * Pure function — no side effects or database calls.
 */

export interface ExpenseMapInput {
  id: string;
  user_id: string;
  project_id: string | null;
  amount: number;
  tax_amount: number | null;
  category: string | null;
  description: string | null;
  expense_date: string;
  currency_code: string | null;
}

/**
 * Map a KrewPact expense claim to an ERPNext Expense Claim document.
 */
export function mapExpenseToErp(expense: ExpenseMapInput): Record<string, unknown> {
  return {
    employee: expense.user_id,
    posting_date: expense.expense_date,
    currency: expense.currency_code || 'CAD',
    total_claimed_amount: expense.amount,
    total_sanctioned_amount: expense.amount,
    project: expense.project_id || '',
    krewpact_id: expense.id,
    expenses: [
      {
        idx: 1,
        expense_type: expense.category || 'General',
        description: expense.description || '',
        expense_date: expense.expense_date,
        amount: expense.amount,
        sanctioned_amount: expense.amount,
        tax_amount: expense.tax_amount || 0,
      },
    ],
  };
}
