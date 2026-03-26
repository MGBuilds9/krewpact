/**
 * Maps ERPNext Payment Entry to KrewPact format.
 * Pure function — no side effects or database calls.
 * Inbound read-only (ERPNext -> KrewPact).
 */

/**
 * ERPNext Payment Entry status -> KrewPact status mapping.
 */
const STATUS_MAP: Record<string, string> = {
  Draft: 'draft',
  Submitted: 'submitted',
  Paid: 'paid',
  Reconciled: 'paid',
  Cancelled: 'void',
};

/**
 * Map an ERPNext status string to KrewPact payment status.
 * Falls back to 'draft' for unrecognized statuses.
 */
export function mapPaymentStatus(erpStatus: string | undefined | null): string {
  if (!erpStatus) return 'draft';
  return STATUS_MAP[erpStatus] || 'draft';
}

/**
 * Map an ERPNext Payment Entry document to a KrewPact record.
 */
export function fromErpPaymentEntry(
  erpPaymentEntry: Record<string, unknown>,
): Record<string, unknown> {
  return {
    erp_payment_name: erpPaymentEntry.name || '',
    erp_doctype: 'Payment Entry',
    payment_type: erpPaymentEntry.payment_type || '',
    posting_date: erpPaymentEntry.posting_date || null,
    party_type: erpPaymentEntry.party_type || '',
    party_name: erpPaymentEntry.party || '',
    paid_amount: typeof erpPaymentEntry.paid_amount === 'number' ? erpPaymentEntry.paid_amount : 0,
    received_amount:
      typeof erpPaymentEntry.received_amount === 'number' ? erpPaymentEntry.received_amount : 0,
    currency: (erpPaymentEntry.currency as string) || 'CAD',
    status: mapPaymentStatus(erpPaymentEntry.status as string | undefined),
    references: Array.isArray(erpPaymentEntry.references)
      ? (erpPaymentEntry.references as Record<string, unknown>[]).map((ref) => ({
          reference_doctype: ref.reference_doctype || '',
          reference_name: ref.reference_name || '',
          total_amount: ref.total_amount || 0,
          allocated_amount: ref.allocated_amount || 0,
        }))
      : [],
    project_id: erpPaymentEntry.custom_mdm_project_id || null,
    synced_at: new Date().toISOString(),
  };
}
