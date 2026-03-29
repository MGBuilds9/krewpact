/**
 * Maps ERPNext Designation doctype to KrewPact format.
 * Designation is reference data — get and list only, no create/update from KrewPact.
 * Pure function — no side effects or database calls.
 */

export interface DesignationErpResponse {
  name: string;
  designation: string;
  description: string | null;
  creation: string;
  modified: string;
}

export interface DesignationMapped {
  erp_name: string;
  designation: string;
  description: string | null;
}

/**
 * Map an ERPNext Designation document to KrewPact format.
 */
export function mapDesignationFromErp(desg: DesignationErpResponse): DesignationMapped {
  return {
    erp_name: desg.name,
    designation: desg.designation,
    description: desg.description || null,
  };
}
