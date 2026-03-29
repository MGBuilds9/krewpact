/**
 * Maps KrewPact UOM data to ERPNext UOM doctype format.
 * Reference data — rarely written. Primarily get/list.
 * Pure function — no side effects or database calls.
 */

export interface UomMapInput {
  id: string;
  uom_name: string;
  must_be_whole_number: boolean;
}

/**
 * Map a KrewPact UOM to an ERPNext UOM document.
 */
export function mapUomToErp(uom: UomMapInput): Record<string, unknown> {
  return {
    uom_name: uom.uom_name,
    must_be_whole_number: uom.must_be_whole_number ? 1 : 0,
    krewpact_id: uom.id,
  };
}
