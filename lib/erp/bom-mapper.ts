/**
 * Maps KrewPact BOM data to ERPNext BOM doctype format.
 * Pure function — no side effects or database calls.
 */

export interface BomMapInput {
  id: string;
  item_code: string;
  item_name: string;
  quantity: number;
  is_active: boolean;
  is_default: boolean;
  currency: string;
  remarks: string | null;
  items: BomItemInput[];
}

export interface BomItemInput {
  item_code: string;
  item_name: string;
  description: string;
  qty: number;
  uom: string;
  rate: number;
  amount: number;
  source_warehouse: string | null;
}

/**
 * Map a KrewPact BOM to an ERPNext BOM document.
 */
export function mapBomToErp(bom: BomMapInput): Record<string, unknown> {
  return {
    item: bom.item_code,
    item_name: bom.item_name,
    quantity: bom.quantity,
    is_active: bom.is_active ? 1 : 0,
    is_default: bom.is_default ? 1 : 0,
    currency: bom.currency || 'CAD',
    remarks: bom.remarks || '',
    krewpact_id: bom.id,
    items: bom.items.map((item, idx) => ({
      idx: idx + 1,
      item_code: item.item_code,
      item_name: item.item_name,
      description: item.description,
      qty: item.qty,
      uom: item.uom || 'Nos',
      rate: item.rate,
      amount: item.amount,
      source_warehouse: item.source_warehouse || '',
    })),
  };
}
