/**
 * Maps KrewPact goods receipt data to ERPNext Purchase Receipt doctype format.
 * Pure function — no side effects or database calls.
 */

export interface PurchaseReceiptMapInput {
  id: string;
  receipt_number: string;
  supplier_name: string;
  posting_date: string;
  purchase_order_name: string | null;
  items: PurchaseReceiptItemInput[];
}

export interface PurchaseReceiptItemInput {
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
 * Map a KrewPact goods receipt to an ERPNext Purchase Receipt document.
 */
export function mapPurchaseReceiptToErp(receipt: PurchaseReceiptMapInput): Record<string, unknown> {
  return {
    naming_series: 'MAT-PRE-.YYYY.-',
    title: receipt.receipt_number,
    supplier: receipt.supplier_name,
    posting_date: receipt.posting_date,
    currency: 'CAD',
    krewpact_id: receipt.id,
    ...(receipt.purchase_order_name ? { purchase_order: receipt.purchase_order_name } : {}),
    items: receipt.items.map((item, idx) => ({
      idx: idx + 1,
      item_code: item.item_code,
      item_name: item.item_name,
      description: item.description,
      qty: item.qty,
      rate: item.rate,
      amount: item.amount,
      uom: item.uom || 'Nos',
      warehouse: item.warehouse || '',
    })),
  };
}
