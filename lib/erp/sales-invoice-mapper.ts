/**
 * Maps ERPNext Sales Invoice to KrewPact invoice_snapshot format.
 * Pure function — no side effects or database calls.
 * Inbound read-only (ERPNext -> KrewPact).
 */

/**
 * ERPNext Sales Invoice status -> KrewPact invoice_snapshot_status enum mapping.
 */
const STATUS_MAP: Record<string, string> = {
  Draft: 'draft',
  Submitted: 'submitted',
  Unpaid: 'submitted',
  Overdue: 'overdue',
  'Partly Paid': 'paid',
  Paid: 'paid',
  Cancelled: 'cancelled',
  'Credit Note Issued': 'cancelled',
  Return: 'cancelled',
};

/**
 * Map an ERPNext status string to KrewPact invoice_snapshot_status.
 * Falls back to 'draft' for unrecognized statuses.
 */
export function mapInvoiceStatus(erpStatus: string | undefined | null): string {
  if (!erpStatus) return 'draft';
  return STATUS_MAP[erpStatus] || 'draft';
}

/**
 * Map an ERPNext Sales Invoice document to a KrewPact invoice_snapshot record.
 */
export function fromErpSalesInvoice(erpInvoice: Record<string, unknown>): Record<string, unknown> {
  return {
    erp_invoice_name: erpInvoice.name || '',
    erp_doctype: 'Sales Invoice',
    customer_name: erpInvoice.customer || '',
    posting_date: erpInvoice.posting_date || null,
    due_date: erpInvoice.due_date || null,
    currency: (erpInvoice.currency as string) || 'CAD',
    grand_total: typeof erpInvoice.grand_total === 'number' ? erpInvoice.grand_total : 0,
    outstanding_amount:
      typeof erpInvoice.outstanding_amount === 'number' ? erpInvoice.outstanding_amount : 0,
    status: mapInvoiceStatus(erpInvoice.status as string | undefined),
    project_id: erpInvoice.custom_mdm_project_id || null,
    account_id: erpInvoice.custom_mdm_account_id || null,
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
