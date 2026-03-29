/**
 * Maps KrewPact warehouse data to ERPNext Warehouse doctype format.
 * Pure function — no side effects or database calls.
 */

export interface WarehouseMapInput {
  id: string;
  warehouse_name: string;
  warehouse_type: string | null;
  parent_warehouse: string | null;
  company: string;
  is_group: boolean;
}

/**
 * Map a KrewPact warehouse to an ERPNext Warehouse document.
 */
export function mapWarehouseToErp(wh: WarehouseMapInput): Record<string, unknown> {
  return {
    warehouse_name: wh.warehouse_name,
    warehouse_type: wh.warehouse_type || 'Warehouse',
    parent_warehouse: wh.parent_warehouse || '',
    company: wh.company,
    is_group: wh.is_group ? 1 : 0,
    krewpact_id: wh.id,
  };
}
