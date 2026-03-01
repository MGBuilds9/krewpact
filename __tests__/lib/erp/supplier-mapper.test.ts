import { describe, it, expect } from 'vitest';
import { mapSupplierToErp, type SupplierMapInput } from '@/lib/erp/supplier-mapper';

function makeInput(overrides: Partial<SupplierMapInput> = {}): SupplierMapInput {
  return {
    id: 'portal-001',
    company_name: 'Premier Electrical Ltd.',
    account_type: 'trade_partner',
    billing_address: { street: '100 Industrial Rd', city: 'Brampton', province: 'ON', postal_code: 'L6T 2E8' },
    division_id: 'div-telecom',
    ...overrides,
  };
}

describe('mapSupplierToErp', () => {
  it('maps all fields correctly', () => {
    const result = mapSupplierToErp(makeInput());
    expect(result.supplier_name).toBe('Premier Electrical Ltd.');
    expect(result.supplier_type).toBe('Company');
    expect(result.supplier_group).toBe('All Supplier Groups');
    expect(result.country).toBe('Canada');
    expect(result.default_currency).toBe('CAD');
    expect(result.krewpact_id).toBe('portal-001');
  });

  it('stores account_type in supplier_details', () => {
    const result = mapSupplierToErp(makeInput());
    expect(result.supplier_details).toBe('trade_partner');
  });

  it('defaults supplier_details to empty string when account_type is null', () => {
    const result = mapSupplierToErp(makeInput({ account_type: null }));
    expect(result.supplier_details).toBe('');
  });

  it('serialises billing_address to primary_address JSON', () => {
    const result = mapSupplierToErp(makeInput());
    expect(result.primary_address).toContain('Brampton');
  });

  it('sets primary_address to null when billing_address is null', () => {
    const result = mapSupplierToErp(makeInput({ billing_address: null }));
    expect(result.primary_address).toBeNull();
  });

  it('always sets country to Canada', () => {
    const result = mapSupplierToErp(makeInput());
    expect(result.country).toBe('Canada');
  });

  it('always sets default_currency to CAD', () => {
    const result = mapSupplierToErp(makeInput());
    expect(result.default_currency).toBe('CAD');
  });
});
