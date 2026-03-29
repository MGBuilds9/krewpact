/**
 * Maps ERPNext Company doctype to/from KrewPact organization format.
 * Company maps to organizations table.
 * Pure function — no side effects or database calls.
 */

export interface CompanyErpResponse {
  name: string;
  company_name: string;
  abbr: string;
  default_currency: string;
  country: string;
  domain: string | null;
  creation: string;
  modified: string;
}

export interface CompanyMapped {
  erp_name: string;
  company_name: string;
  abbreviation: string;
  default_currency: string;
  country: string;
}

/**
 * Map an ERPNext Company document to KrewPact format.
 */
export function mapCompanyFromErp(company: CompanyErpResponse): CompanyMapped {
  return {
    erp_name: company.name,
    company_name: company.company_name,
    abbreviation: company.abbr,
    default_currency: company.default_currency,
    country: company.country,
  };
}

export interface CompanyUpdateInput {
  id: string;
  company_name: string;
  abbreviation: string;
  default_currency: string;
  country: string;
}

/**
 * Map a KrewPact organization update to ERPNext Company format.
 */
export function mapCompanyToErp(input: CompanyUpdateInput): Record<string, unknown> {
  return {
    company_name: input.company_name,
    abbr: input.abbreviation,
    default_currency: input.default_currency || 'CAD',
    country: input.country || 'Canada',
    krewpact_id: input.id,
  };
}
