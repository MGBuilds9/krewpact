/**
 * Maps KrewPact account data to/from ERPNext Customer doctype format.
 * Pure functions — no side effects or database calls.
 * Bidirectional: outbound (toErpCustomer) and inbound (fromErpCustomer).
 */

export interface CustomerMapInput {
  id: string;
  account_name: string;
  account_type: string | null;
  division_id: string | null;
  status: string | null;
  billing_address: Record<string, unknown> | null;
  phone: string | null;
  website: string | null;
  industry: string | null;
}

/**
 * Map account_type to ERPNext customer_type.
 * 'individual' -> 'Individual', everything else -> 'Company'
 */
function mapCustomerType(accountType: string | null): string {
  if (accountType === 'individual') return 'Individual';
  return 'Company';
}

/**
 * Map KrewPact status to ERPNext disabled flag.
 * 'inactive' -> 1 (disabled), everything else -> 0 (enabled)
 */
function mapDisabledFlag(status: string | null): number {
  return status === 'inactive' ? 1 : 0;
}

/**
 * Map a KrewPact account to an ERPNext Customer document (outbound).
 */
export function toErpCustomer(account: CustomerMapInput): Record<string, unknown> {
  return {
    customer_name: account.account_name,
    customer_type: mapCustomerType(account.account_type),
    customer_group: 'All Customer Groups',
    territory: 'Canada',
    default_currency: 'CAD',
    disabled: mapDisabledFlag(account.status),
    custom_mdm_account_id: account.id,
    custom_division: account.division_id || '',
    website: account.website || '',
    industry: account.industry || '',
    primary_address: account.billing_address
      ? JSON.stringify(account.billing_address)
      : null,
  };
}

/**
 * Map ERPNext customer_type back to KrewPact account_type.
 */
function mapAccountType(customerType: string | undefined): string {
  if (customerType === 'Individual') return 'individual';
  return 'client';
}

/**
 * Map ERPNext disabled flag back to KrewPact status.
 */
function mapStatus(disabled: unknown): string {
  return disabled === 1 || disabled === true ? 'inactive' : 'active';
}

/**
 * Map an ERPNext Customer document to a KrewPact account partial (inbound).
 */
export function fromErpCustomer(
  erpCustomer: Record<string, unknown>,
): Record<string, unknown> {
  return {
    account_name: erpCustomer.customer_name || '',
    account_type: mapAccountType(erpCustomer.customer_type as string | undefined),
    status: mapStatus(erpCustomer.disabled),
    division_id: erpCustomer.custom_division || null,
    website: erpCustomer.website || null,
    industry: erpCustomer.industry || null,
    erp_docname: erpCustomer.name || null,
  };
}
