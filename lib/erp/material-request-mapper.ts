/**
 * Maps KrewPact material request data to ERPNext Material Request doctype format.
 * Pure function — no side effects or database calls.
 */

export interface MaterialRequestMapInput {
  id: string;
  request_number: string;
  request_type: 'Purchase' | 'Material Transfer' | 'Material Issue';
  transaction_date: string;
  required_by_date: string | null;
  project_name: string | null;
  items: MaterialRequestItemInput[];
}

export interface MaterialRequestItemInput {
  item_code: string;
  item_name: string;
  description: string;
  qty: number;
  uom: string;
  warehouse: string | null;
}

/**
 * Map a KrewPact material request to an ERPNext Material Request document.
 */
export function mapMaterialRequestToErp(mr: MaterialRequestMapInput): Record<string, unknown> {
  return {
    naming_series: 'MAT-MR-.YYYY.-',
    title: mr.request_number,
    material_request_type: mr.request_type,
    transaction_date: mr.transaction_date,
    schedule_date: mr.required_by_date || mr.transaction_date,
    currency: 'CAD',
    krewpact_id: mr.id,
    ...(mr.project_name ? { project: mr.project_name } : {}),
    items: mr.items.map((item, idx) => ({
      idx: idx + 1,
      item_code: item.item_code,
      item_name: item.item_name,
      description: item.description,
      qty: item.qty,
      uom: item.uom || 'Nos',
      warehouse: item.warehouse || '',
      schedule_date: mr.required_by_date || mr.transaction_date,
    })),
  };
}
