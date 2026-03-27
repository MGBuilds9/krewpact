/**
 * Maps KrewPact rfq_packages + items to ERPNext Request for Quotation doctype format.
 * Pure function — no side effects or database calls.
 * Outbound only (KrewPact -> ERPNext).
 */

export interface RfqPackageInput {
  id: string;
  rfq_number: string;
  project_id: string;
  project_name: string | null;
  title: string;
  description: string | null;
  scope_of_work: string | null;
  due_date: string | null;
  currency_code: string | null;
  status: string;
}

export interface RfqItemInput {
  item_code?: string | null;
  description: string;
  quantity: number;
  unit: string | null;
  estimated_cost: number | null;
}

/**
 * Map a KrewPact RFQ package + items to an ERPNext Request for Quotation document.
 * due_date maps to schedule_date; scope_of_work maps to message_for_supplier.
 */
export function toErpRequestForQuotation(
  rfq: RfqPackageInput,
  items: RfqItemInput[],
): Record<string, unknown> {
  const currency = rfq.currency_code || 'CAD';
  const today = new Date().toISOString().slice(0, 10);

  const erpItems = items.map((item, idx) => ({
    idx: idx + 1,
    item_code: item.item_code || item.description?.slice(0, 140) || `ITEM-${idx + 1}`,
    item_name: item.description || 'Item',
    description: item.description || '',
    qty: item.quantity,
    uom: item.unit || 'Nos',
    rate: item.estimated_cost ?? 0,
  }));

  return {
    title: rfq.title,
    transaction_date: today,
    schedule_date: rfq.due_date || null,
    currency,
    message_for_supplier: rfq.scope_of_work || rfq.description || '',
    custom_mdm_rfq_id: rfq.id,
    custom_mdm_project_id: rfq.project_id,
    custom_mdm_rfq_number: rfq.rfq_number,
    custom_mdm_project_name: rfq.project_name || '',
    items: erpItems,
  };
}
