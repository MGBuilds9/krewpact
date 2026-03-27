/**
 * Maps an awarded bid to an ERPNext Purchase Order (procurement track).
 * Pure function — no side effects or database calls.
 * Outbound only (KrewPact -> ERPNext).
 */

export interface AwardInput {
  id: string;
  bid_id: string;
  rfq_id: string | null;
  project_id: string;
  project_name: string | null;
  supplier_name: string | null;
  erp_supplier_name: string | null;
  total_amount: number;
  currency_code: string | null;
  award_date: string | null;
  notes: string | null;
}

export interface AwardLineInput {
  item_code?: string | null;
  description: string;
  quantity: number;
  unit: string | null;
  unit_price: number;
  line_total: number;
}

/**
 * Map a KrewPact awarded bid + lines to an ERPNext Purchase Order document.
 * erp_supplier_name or supplier_name used for party linkage.
 */
export function toErpProcurementPO(
  award: AwardInput,
  lines: AwardLineInput[],
): Record<string, unknown> {
  const supplierName = award.erp_supplier_name || award.supplier_name || '';
  const currency = award.currency_code || 'CAD';
  const transactionDate = award.award_date ?? new Date().toISOString().slice(0, 10);

  const items = lines.map((line, idx) => ({
    idx: idx + 1,
    item_code: line.item_code || line.description?.slice(0, 140) || `ITEM-${idx + 1}`,
    item_name: line.description || 'Item',
    description: line.description || '',
    qty: line.quantity,
    rate: line.unit_price,
    amount: line.line_total,
    uom: line.unit || 'Nos',
    schedule_date: award.award_date || new Date().toISOString().split('T')[0],
  }));

  const netTotal = lines.reduce((sum, l) => sum + l.line_total, 0);

  return {
    naming_series: 'PUR-ORD-.YYYY.-',
    supplier: supplierName,
    currency,
    buying_price_list: 'Standard Buying',
    transaction_date: transactionDate,
    schedule_date: transactionDate,
    custom_mdm_award_id: award.id,
    custom_mdm_bid_id: award.bid_id,
    custom_mdm_rfq_id: award.rfq_id ?? '',
    custom_mdm_project_id: award.project_id,
    remarks: award.notes || '',
    net_total: netTotal,
    grand_total: netTotal,
    items,
  };
}
