/**
 * Maps ERPNext Purchase Invoice to KrewPact format.
 * Pure function — no side effects or database calls.
 * Inbound read-only (ERPNext -> KrewPact).
 */

/**
 * ERPNext Purchase Invoice status -> KrewPact status mapping.
 */
const STATUS_MAP: Record<string, string> = {
  Draft: 'draft',
  Submitted: 'submitted',
  Unpaid: 'submitted',
  Overdue: 'submitted',
  'Partly Paid': 'received',
  Paid: 'closed',
  Cancelled: 'cancelled',
  Return: 'cancelled',
};

/**
 * Map an ERPNext status string to KrewPact purchase invoice status.
 * Falls back to 'draft' for unrecognized statuses.
 */
export function mapPurchaseInvoiceStatus(erpStatus: string | undefined | null): string {
  if (!erpStatus) return 'draft';
  return STATUS_MAP[erpStatus] || 'draft';
}

/**
 * Map an ERPNext Purchase Invoice document to a KrewPact record.
 */
export function fromErpPurchaseInvoice(
  erpInvoice: Record<string, unknown>,
): Record<string, unknown> {
  return {
    erp_invoice_name: erpInvoice.name || '',
    erp_doctype: 'Purchase Invoice',
    supplier_name: erpInvoice.supplier || '',
    posting_date: erpInvoice.posting_date || null,
    due_date: erpInvoice.due_date || null,
    currency: (erpInvoice.currency as string) || 'CAD',
    grand_total: typeof erpInvoice.grand_total === 'number' ? erpInvoice.grand_total : 0,
    outstanding_amount:
      typeof erpInvoice.outstanding_amount === 'number' ? erpInvoice.outstanding_amount : 0,
    status: mapPurchaseInvoiceStatus(erpInvoice.status as string | undefined),
    project_id: erpInvoice.custom_mdm_project_id || null,
    supplier_id: erpInvoice.custom_mdm_supplier_id || null,
    items: Array.isArray(erpInvoice.items)
      ? (erpInvoice.items as Record<string, unknown>[]).map((item) => ({
          item_name: item.item_name || '',
          description: item.description || '',
          qty: item.qty || 0,
          rate: item.rate || 0,
          amount: item.amount || 0,
        }))
      : [],
    synced_at: new Date().toISOString(),
  };
}
