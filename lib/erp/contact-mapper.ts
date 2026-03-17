/**
 * Maps KrewPact contact data to ERPNext Contact doctype format.
 * Pure function — no side effects or database calls.
 */

export interface ContactMapInput {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  role_title: string | null;
  account_id: string | null;
}

/**
 * Map a KrewPact contact to an ERPNext Contact document.
 *
 * IMPORTANT: The sync handler (sync-contact.ts) is responsible for resolving
 * account_id to the ERPNext Customer docname from erp_sync_map before calling
 * this function. The value passed as account_id must be the ERPNext Customer
 * docname, NOT the KrewPact UUID, or ERPNext link validation will fail.
 */
export function mapContactToErp(contact: ContactMapInput): Record<string, unknown> {
  return {
    first_name: contact.first_name,
    last_name: contact.last_name,
    full_name: `${contact.first_name} ${contact.last_name}`.trim(),
    designation: contact.role_title || '',
    krewpact_id: contact.id,
    links: contact.account_id ? [{ link_doctype: 'Customer', link_name: contact.account_id }] : [],
    email_ids: contact.email ? [{ email_id: contact.email, is_primary: 1 }] : [],
    phone_nos: contact.phone ? [{ phone: contact.phone, is_primary_phone: 1 }] : [],
  };
}
