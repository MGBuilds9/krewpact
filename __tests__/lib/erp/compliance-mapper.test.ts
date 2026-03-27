import { describe, expect, it } from 'vitest';

import { type ComplianceDocInput, toErpComplianceDoc } from '@/lib/erp/compliance-mapper';

function makeDoc(overrides: Partial<ComplianceDocInput> = {}): ComplianceDocInput {
  return {
    id: 'comp-001',
    portal_account_id: 'portal-001',
    supplier_name: 'Apex Trades Ltd.',
    erp_supplier_name: null,
    doc_type: 'insurance',
    doc_name: 'Commercial General Liability 2026',
    expiry_date: '2026-12-31',
    status: 'active',
    file_url: 'https://storage.example.com/comp-001.pdf',
    ...overrides,
  };
}

describe('toErpComplianceDoc', () => {
  it('maps all compliance doc fields correctly', () => {
    const result = toErpComplianceDoc(makeDoc());
    expect(result.supplier).toBe('Apex Trades Ltd.');
    expect(result.compliance_type).toBe('insurance');
    expect(result.document_name).toBe('Commercial General Liability 2026');
    expect(result.expiry_date).toBe('2026-12-31');
    expect(result.status).toBe('active');
    expect(result.file_url).toBe('https://storage.example.com/comp-001.pdf');
    expect(result.custom_mdm_compliance_id).toBe('comp-001');
    expect(result.custom_mdm_portal_account_id).toBe('portal-001');
  });

  it('prefers erp_supplier_name over supplier_name', () => {
    const result = toErpComplianceDoc(makeDoc({ erp_supplier_name: 'SUPP-00099' }));
    expect(result.supplier).toBe('SUPP-00099');
  });

  it('falls back to supplier_name when erp_supplier_name is null', () => {
    const result = toErpComplianceDoc(makeDoc({ erp_supplier_name: null }));
    expect(result.supplier).toBe('Apex Trades Ltd.');
  });

  it('defaults supplier to empty when both names are null', () => {
    const result = toErpComplianceDoc(makeDoc({ erp_supplier_name: null, supplier_name: null }));
    expect(result.supplier).toBe('');
  });

  it('defaults expiry_date to empty string when null', () => {
    const result = toErpComplianceDoc(makeDoc({ expiry_date: null }));
    expect(result.expiry_date).toBe('');
  });

  it('defaults file_url to empty string when null', () => {
    const result = toErpComplianceDoc(makeDoc({ file_url: null }));
    expect(result.file_url).toBe('');
  });

  it('maps all doc_type variants correctly', () => {
    const types = ['insurance', 'wsib', 'license', 'certification', 'safety', 'other'];
    for (const doc_type of types) {
      const result = toErpComplianceDoc(makeDoc({ doc_type }));
      expect(result.compliance_type).toBe(doc_type);
    }
  });

  it('passes through status as-is', () => {
    const result = toErpComplianceDoc(makeDoc({ status: 'expired' }));
    expect(result.status).toBe('expired');
  });

  it('maps custom fields with correct key names', () => {
    const result = toErpComplianceDoc(makeDoc());
    expect(Object.keys(result)).toContain('custom_mdm_compliance_id');
    expect(Object.keys(result)).toContain('custom_mdm_portal_account_id');
  });
});
