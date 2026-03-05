/**
 * Maps KrewPact estimate + lines to ERPNext Quotation doctype format.
 * Pure function — no side effects or database calls.
 * Outbound only (KrewPact -> ERPNext).
 */

export interface QuotationEstimateInput {
  id: string;
  estimate_number: string;
  revision_no: number | null;
  currency_code: string | null;
  account_id: string | null;
  account_name: string | null;
  erp_customer_name: string | null;
  notes: string | null;
}

export interface QuotationLineInput {
  description: string;
  quantity: number;
  unit_cost: number;
  unit: string | null;
  line_total: number;
}

/**
 * Map a KrewPact estimate + lines to an ERPNext Quotation document.
 * account_name or erp_customer_name used for party linkage.
 */
export function toErpQuotation(
  estimate: QuotationEstimateInput,
  lines: QuotationLineInput[],
): Record<string, unknown> {
  const customerName = estimate.erp_customer_name || estimate.account_name || '';
  const currency = estimate.currency_code || 'CAD';

  const items = lines.map((line, idx) => ({
    idx: idx + 1,
    item_name: line.description || 'Item',
    description: line.description || '',
    qty: line.quantity,
    rate: line.unit_cost,
    amount: line.line_total,
    uom: line.unit || 'Nos',
  }));

  const netTotal = lines.reduce((sum, l) => sum + l.line_total, 0);

  return {
    quotation_to: 'Customer',
    party_name: customerName,
    title: estimate.estimate_number,
    currency,
    custom_mdm_estimate_id: estimate.id,
    custom_mdm_estimate_version: estimate.revision_no ?? 1,
    terms: estimate.notes || '',
    net_total: netTotal,
    grand_total: netTotal,
    items,
  };
}
