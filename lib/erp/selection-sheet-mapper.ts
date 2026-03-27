/**
 * Maps KrewPact selection sheets to ERPNext custom MDM Selection Sheet.
 * Pure function — no side effects or database calls.
 * Outbound only (KrewPact -> ERPNext).
 */

export interface SelectionSheetInput {
  id: string;
  project_id: string;
  project_name: string | null;
  title: string;
  category: string | null;
  status: string;
  allowance_amount: number | null;
  currency_code: string | null;
}

export interface SelectionChoiceInput {
  option_name: string;
  supplier_name: string | null;
  unit_cost: number;
  quantity: number;
  total_cost: number;
  is_selected: boolean;
}

/**
 * Map a KrewPact selection sheet + choices to an ERPNext MDM Selection Sheet document.
 * project_name used for project linkage.
 */
export function toErpSelectionSheet(
  sheet: SelectionSheetInput,
  choices: SelectionChoiceInput[],
): Record<string, unknown> {
  const currency = sheet.currency_code || 'CAD';

  const options = choices.map((choice, idx) => ({
    idx: idx + 1,
    option_name: choice.option_name,
    supplier: choice.supplier_name ?? '',
    rate: choice.unit_cost,
    qty: choice.quantity,
    amount: choice.total_cost,
    selected: choice.is_selected ? 1 : 0,
  }));

  return {
    project: sheet.project_name ?? '',
    title: sheet.title,
    category: sheet.category ?? '',
    status: sheet.status,
    allowance_amount: sheet.allowance_amount ?? 0,
    currency,
    custom_mdm_selection_id: sheet.id,
    custom_mdm_project_id: sheet.project_id,
    options,
  };
}
