/**
 * Maps KrewPact trade partner compliance docs to ERPNext custom MDM Trade Compliance Doc.
 * Pure function — no side effects or database calls.
 * Outbound only (KrewPact -> ERPNext).
 */

export interface ComplianceDocInput {
  id: string;
  portal_account_id: string;
  supplier_name: string | null;
  erp_supplier_name: string | null;
  doc_type: string; // 'insurance' | 'wsib' | 'license' | 'certification' | 'safety' | 'other'
  doc_name: string;
  expiry_date: string | null;
  status: string;
  file_url: string | null;
}

/**
 * Map a KrewPact compliance doc to an ERPNext MDM Trade Compliance Doc document.
 * erp_supplier_name or supplier_name used for party linkage.
 */
export function toErpComplianceDoc(doc: ComplianceDocInput): Record<string, unknown> {
  const supplierName = doc.erp_supplier_name || doc.supplier_name || '';

  return {
    supplier: supplierName,
    compliance_type: doc.doc_type,
    document_name: doc.doc_name,
    expiry_date: doc.expiry_date ?? '',
    status: doc.status,
    file_url: doc.file_url ?? '',
    custom_mdm_compliance_id: doc.id,
    custom_mdm_portal_account_id: doc.portal_account_id,
  };
}
