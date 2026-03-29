/**
 * Maps KrewPact supplier quotation data to ERPNext Supplier Quotation doctype format.
 * Pure function — no side effects or database calls.
 */

export interface SupplierQuotationMapInput {
  id: string;
  quotation_number: string;
  supplier_name: string;
  transaction_date: string;
  valid_till: string | null;
  currency: string;
  total_amount: number;
  items: SupplierQuotationItemInput[];
}

export interface SupplierQuotationItemInput {
  item_code: string;
  item_name: string;
  description: string;
  qty: number;
  rate: number;
  amount: number;
  uom: string;
}

/**
 * Map a KrewPact supplier quotation to an ERPNext Supplier Quotation document.
 */
export function mapSupplierQuotationToErp(
  sq: SupplierQuotationMapInput,
): Record<string, unknown> {
  return {
    naming_series: 'SQTN-.YYYY.-',
    title: sq.quotation_number,
    supplier: sq.supplier_name,
    transaction_date: sq.transaction_date,
    valid_till: sq.valid_till || null,
    currency: sq.currency || 'CAD',
    grand_total: sq.total_amount,
    krewpact_id: sq.id,
    items: sq.items.map((item, idx) => ({
      idx: idx + 1,
      item_code: item.item_code,
      item_name: item.item_name,
      description: item.description,
      qty: item.qty,
      rate: item.rate,
      amount: item.amount,
      uom: item.uom || 'Nos',
    })),
  };
}
