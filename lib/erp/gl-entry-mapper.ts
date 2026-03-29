/**
 * Maps ERPNext GL Entry to KrewPact format.
 * Pure function — no side effects or database calls.
 * STRICTLY READ ONLY — GL entries are never created or updated from KrewPact.
 */

/** Safely extract a numeric value, defaulting to 0 for non-numbers. */
function toNum(value: unknown): number {
  return typeof value === 'number' ? value : 0;
}

/** Safely extract a string value, defaulting to fallback. */
function toStr(value: unknown, fallback = ''): string {
  return (value as string) || fallback;
}

/**
 * Map an ERPNext GL Entry document to a KrewPact record.
 */
export function fromErpGlEntry(
  erpEntry: Record<string, unknown>,
): Record<string, unknown> {
  return {
    erp_gl_name: toStr(erpEntry.name),
    erp_doctype: 'GL Entry',
    posting_date: erpEntry.posting_date || null,
    account: toStr(erpEntry.account),
    party_type: toStr(erpEntry.party_type),
    party: toStr(erpEntry.party),
    debit: toNum(erpEntry.debit),
    credit: toNum(erpEntry.credit),
    debit_in_account_currency: toNum(erpEntry.debit_in_account_currency),
    credit_in_account_currency: toNum(erpEntry.credit_in_account_currency),
    account_currency: toStr(erpEntry.account_currency, 'CAD'),
    cost_center: toStr(erpEntry.cost_center),
    project: toStr(erpEntry.project),
    voucher_type: toStr(erpEntry.voucher_type),
    voucher_no: toStr(erpEntry.voucher_no),
    against: toStr(erpEntry.against),
    company: toStr(erpEntry.company),
    is_cancelled: erpEntry.is_cancelled === 1,
    synced_at: new Date().toISOString(),
  };
}
