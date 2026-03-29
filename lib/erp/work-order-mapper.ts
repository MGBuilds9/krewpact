/**
 * Maps KrewPact work order data to ERPNext Work Order doctype format.
 * Pure function — no side effects or database calls.
 */

export interface WorkOrderMapInput {
  id: string;
  production_item: string;
  item_name: string;
  bom_no: string;
  qty: number;
  planned_start_date: string;
  expected_delivery_date: string | null;
  project_name: string | null;
  remarks: string | null;
}

/**
 * Map a KrewPact work order to an ERPNext Work Order document.
 */
export function mapWorkOrderToErp(wo: WorkOrderMapInput): Record<string, unknown> {
  return {
    naming_series: 'MFN-WO-.YYYY.-',
    production_item: wo.production_item,
    item_name: wo.item_name,
    bom_no: wo.bom_no,
    qty: wo.qty,
    planned_start_date: wo.planned_start_date,
    expected_delivery_date: wo.expected_delivery_date || wo.planned_start_date,
    currency: 'CAD',
    krewpact_id: wo.id,
    remarks: wo.remarks || '',
    ...(wo.project_name ? { project: wo.project_name } : {}),
  };
}
