/**
 * Maps KrewPact RFQ data to ERPNext Request for Quotation doctype format.
 * Pure function — no side effects or database calls.
 */

export interface RequestForQuotationMapInput {
  id: string;
  rfq_number: string;
  transaction_date: string;
  message_for_supplier: string | null;
  suppliers: RfqSupplierInput[];
  items: RfqItemInput[];
}

export interface RfqSupplierInput {
  supplier_name: string;
  email: string | null;
}

export interface RfqItemInput {
  item_code: string;
  item_name: string;
  description: string;
  qty: number;
  uom: string;
  warehouse: string | null;
}

/**
 * Map a KrewPact request for quotation to an ERPNext Request for Quotation document.
 */
export function mapRequestForQuotationToErp(
  rfq: RequestForQuotationMapInput,
): Record<string, unknown> {
  return {
    naming_series: 'PUR-RFQ-.YYYY.-',
    title: rfq.rfq_number,
    transaction_date: rfq.transaction_date,
    message_for_supplier: rfq.message_for_supplier || '',
    currency: 'CAD',
    krewpact_id: rfq.id,
    suppliers: rfq.suppliers.map((s) => ({
      supplier: s.supplier_name,
      email_id: s.email || '',
    })),
    items: rfq.items.map((item, idx) => ({
      idx: idx + 1,
      item_code: item.item_code,
      item_name: item.item_name,
      description: item.description,
      qty: item.qty,
      uom: item.uom || 'Nos',
      warehouse: item.warehouse || '',
    })),
  };
}
