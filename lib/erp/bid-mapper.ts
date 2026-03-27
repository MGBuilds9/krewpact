/**
 * Maps KrewPact proposals/bids to ERPNext Supplier Quotation doctype format.
 * Pure function — no side effects or database calls.
 * Outbound only (KrewPact -> ERPNext).
 */

export interface BidInput {
  id: string;
  rfq_id: string | null;
  supplier_name: string | null;
  erp_supplier_name: string | null;
  total_amount: number;
  scope_summary: string | null;
  notes: string | null;
  currency_code: string | null;
  submitted_at: string | null;
}

export interface BidLineInput {
  item_code?: string | null;
  description: string;
  quantity: number;
  unit: string | null;
  unit_price: number;
  line_total: number;
}

/**
 * Map a KrewPact bid + lines to an ERPNext Supplier Quotation document.
 * erp_supplier_name preferred over supplier_name for party linkage.
 */
export function toErpSupplierQuotation(
  bid: BidInput,
  lines: BidLineInput[],
): Record<string, unknown> {
  const supplier = bid.erp_supplier_name || bid.supplier_name || '';
  const currency = bid.currency_code || 'CAD';

  const erpItems = lines.map((line, idx) => ({
    idx: idx + 1,
    item_code: line.item_code || line.description?.slice(0, 140) || `ITEM-${idx + 1}`,
    item_name: line.description || 'Item',
    description: line.description || '',
    qty: line.quantity,
    uom: line.unit || 'Nos',
    rate: line.unit_price,
    amount: line.line_total,
  }));

  const netTotal = lines.reduce((sum, l) => sum + l.line_total, 0);

  return {
    supplier,
    currency,
    transaction_date: bid.submitted_at
      ? bid.submitted_at.slice(0, 10)
      : new Date().toISOString().slice(0, 10),
    terms: bid.notes || bid.scope_summary || '',
    net_total: netTotal,
    grand_total: netTotal,
    custom_mdm_bid_id: bid.id,
    custom_mdm_rfq_id: bid.rfq_id || '',
    items: erpItems,
  };
}
