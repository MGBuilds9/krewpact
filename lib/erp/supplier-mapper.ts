/**
 * Maps KrewPact trade partner / portal account data to ERPNext Supplier doctype format.
 * Pure function — no side effects or database calls.
 */

export interface SupplierMapInput {
  id: string;
  company_name: string;
  account_type: string | null;
  billing_address: Record<string, unknown> | null;
  division_id: string | null;
}

/**
 * Map a KrewPact portal account (trade partner) to an ERPNext Supplier document.
 */
export function mapSupplierToErp(supplier: SupplierMapInput): Record<string, unknown> {
  return {
    supplier_name: supplier.company_name,
    supplier_type: 'Company',
    supplier_group: 'All Supplier Groups',
    country: 'Canada',
    default_currency: 'CAD',
    krewpact_id: supplier.id,
    supplier_details: supplier.account_type || '',
    // Note: billing_address is serialised as JSON here for storage reference, but
    // ERPNext Address is a separate linked doctype. This field will be silently
    // ignored by ERPNext on Supplier creation. A follow-up Address document POST
    // is required to link the address properly. See TODO: ADDR-SYNC.
    primary_address: supplier.billing_address ? JSON.stringify(supplier.billing_address) : null,
  };
}
