/**
 * Maps KrewPact serial number data to ERPNext Serial No doctype format.
 * Pure function — no side effects or database calls.
 */

export interface SerialNoMapInput {
  id: string;
  serial_no: string;
  item_code: string;
  item_name: string;
  warehouse: string | null;
  status: 'Active' | 'Inactive' | 'Delivered' | 'Expired';
  purchase_date: string | null;
  warranty_expiry_date: string | null;
  description: string | null;
}

/**
 * Map a KrewPact serial number to an ERPNext Serial No document.
 */
export function mapSerialNoToErp(sn: SerialNoMapInput): Record<string, unknown> {
  return {
    serial_no: sn.serial_no,
    item_code: sn.item_code,
    item_name: sn.item_name,
    warehouse: sn.warehouse || '',
    status: sn.status,
    description: sn.description || sn.item_name,
    krewpact_id: sn.id,
    ...(sn.purchase_date ? { purchase_date: sn.purchase_date } : {}),
    ...(sn.warranty_expiry_date ? { warranty_expiry_date: sn.warranty_expiry_date } : {}),
  };
}
