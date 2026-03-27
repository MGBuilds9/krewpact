/**
 * Maps KrewPact billing_address JSON to ERPNext Address doctype format.
 * Pure function — no side effects or database calls.
 */

export interface AddressMapInput {
  address: Record<string, unknown>;
  ownerName: string; // company/person name for address_title
  linkDoctype: 'Customer' | 'Supplier';
  linkName: string; // ERPNext docname
}

/**
 * Map a KrewPact billing_address object to an ERPNext Address document.
 * Returns null if the address object is empty or has no meaningful fields.
 */
export function toErpAddress(input: AddressMapInput): Record<string, unknown> | null {
  const { address, ownerName, linkDoctype, linkName } = input;

  if (!address || Object.keys(address).length === 0) {
    return null;
  }

  const street = (address.street as string | undefined) || '';
  const suite = (address.suite as string | undefined) || '';
  const city = (address.city as string | undefined) || '';
  const province = (address.province as string | undefined) || '';
  const postalCode = (address.postal_code as string | undefined) || '';
  const country = (address.country as string | undefined) || 'Canada';

  // Skip if there are no meaningful address fields
  const hasMeaningfulData = street || city || province || postalCode;
  if (!hasMeaningfulData) {
    return null;
  }

  return {
    address_title: ownerName,
    address_type: 'Billing',
    address_line1: street,
    address_line2: suite,
    city,
    state: province,
    pincode: postalCode,
    country,
    is_primary_address: 1,
    links: [
      {
        link_doctype: linkDoctype,
        link_name: linkName,
      },
    ],
  };
}
