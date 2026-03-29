/**
 * Maps KrewPact purchase order data to ERPNext Purchase Order doctype format.
 * Pure function — no side effects or database calls.
 */

export interface PurchaseOrderMapInput {
  id: string;
  po_number: string;
  supplier_name: string;
  order_date: string;
  expected_delivery_date: string | null;
  currency: string;
  total_amount: number;
  notes: string | null;
  items: PurchaseOrderItemInput[];
}

export interface PurchaseOrderItemInput {
  item_code: string;
  item_name: string;
  description: string;
  qty: number;
  rate: number;
  amount: number;
  uom: string;
  warehouse: string | null;
}

/**
 * Map a KrewPact purchase order to an ERPNext Purchase Order document.
 */
export function mapPurchaseOrderToErp(po: PurchaseOrderMapInput): Record<string, unknown> {
  return {
    naming_series: 'PUR-ORD-.YYYY.-',
    title: po.po_number,
    supplier: po.supplier_name,
    transaction_date: po.order_date,
    schedule_date: po.expected_delivery_date || po.order_date,
    currency: po.currency || 'CAD',
    buying_price_list: 'Standard Buying',
    grand_total: po.total_amount,
    remarks: po.notes || '',
    krewpact_id: po.id,
    items: po.items.map((item, idx) => ({
      idx: idx + 1,
      item_code: item.item_code,
      item_name: item.item_name,
      description: item.description,
      qty: item.qty,
      rate: item.rate,
      amount: item.amount,
      uom: item.uom || 'Nos',
      warehouse: item.warehouse || '',
      schedule_date: po.expected_delivery_date || po.order_date,
    })),
  };
}
