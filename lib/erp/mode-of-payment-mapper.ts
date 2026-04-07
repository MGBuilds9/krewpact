/**
 * Maps ERPNext Mode of Payment to KrewPact format.
 * Pure function — no side effects or database calls.
 * Reference data — rarely written from KrewPact side.
 */

/**
 * Map an ERPNext Mode of Payment document to a KrewPact record.
 */
export function fromErpModeOfPayment(erpMode: Record<string, unknown>): Record<string, unknown> {
  return {
    erp_mode_name: erpMode.name || '',
    erp_doctype: 'Mode of Payment',
    mode_of_payment: erpMode.mode_of_payment || erpMode.name || '',
    type: erpMode.type || '',
    enabled: erpMode.enabled !== 0,
    accounts: Array.isArray(erpMode.accounts)
      ? (erpMode.accounts as Record<string, unknown>[]).map((acct) => ({
          company: acct.company || '',
          default_account: acct.default_account || '',
        }))
      : [],
    synced_at: new Date().toISOString(),
  };
}
