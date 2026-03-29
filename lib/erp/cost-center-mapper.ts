/**
 * Maps KrewPact cost center data to/from ERPNext Cost Center doctype format.
 * Pure function — no side effects or database calls.
 */

export interface CostCenterMapInput {
  id: string;
  cost_center_name: string;
  parent_cost_center: string | null;
  company: string;
  is_group: boolean;
}

/**
 * Map a KrewPact cost center to an ERPNext Cost Center document.
 */
export function mapCostCenterToErp(
  cc: CostCenterMapInput,
): Record<string, unknown> {
  return {
    cost_center_name: cc.cost_center_name,
    parent_cost_center: cc.parent_cost_center || '',
    company: cc.company,
    is_group: cc.is_group ? 1 : 0,
    krewpact_id: cc.id,
  };
}

/**
 * Map an ERPNext Cost Center document to a KrewPact record.
 */
export function fromErpCostCenter(
  erpCostCenter: Record<string, unknown>,
): Record<string, unknown> {
  return {
    erp_cost_center_name: erpCostCenter.name || '',
    erp_doctype: 'Cost Center',
    cost_center_name: erpCostCenter.cost_center_name || '',
    parent_cost_center: erpCostCenter.parent_cost_center || '',
    company: erpCostCenter.company || '',
    is_group: erpCostCenter.is_group === 1,
    synced_at: new Date().toISOString(),
  };
}
