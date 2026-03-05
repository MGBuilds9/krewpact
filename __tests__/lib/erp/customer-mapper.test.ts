import { describe, it, expect } from 'vitest';
import {
  toErpCustomer,
  fromErpCustomer,
  type CustomerMapInput,
} from '@/lib/erp/customer-mapper';

function makeInput(overrides: Partial<CustomerMapInput> = {}): CustomerMapInput {
  return {
    id: 'acct-001',
    account_name: 'Acme Construction Ltd.',
    account_type: 'client',
    division_id: 'contracting',
    status: 'active',
    billing_address: {
      street: '123 Main St',
      city: 'Mississauga',
      province: 'ON',
      postal_code: 'L5B 1M2',
    },
    phone: '905-555-0100',
    website: 'https://acme.ca',
    industry: 'Construction',
    ...overrides,
  };
}

describe('toErpCustomer', () => {
  it('maps all fields correctly for a company account', () => {
    const result = toErpCustomer(makeInput());
    expect(result.customer_name).toBe('Acme Construction Ltd.');
    expect(result.customer_type).toBe('Company');
    expect(result.customer_group).toBe('All Customer Groups');
    expect(result.territory).toBe('Canada');
    expect(result.default_currency).toBe('CAD');
    expect(result.disabled).toBe(0);
    expect(result.custom_mdm_account_id).toBe('acct-001');
    expect(result.custom_division).toBe('contracting');
    expect(result.website).toBe('https://acme.ca');
    expect(result.industry).toBe('Construction');
  });

  it('maps individual account_type to Individual customer_type', () => {
    const result = toErpCustomer(makeInput({ account_type: 'individual' }));
    expect(result.customer_type).toBe('Individual');
  });

  it('maps client account_type to Company customer_type', () => {
    const result = toErpCustomer(makeInput({ account_type: 'client' }));
    expect(result.customer_type).toBe('Company');
  });

  it('defaults null account_type to Company', () => {
    const result = toErpCustomer(makeInput({ account_type: null }));
    expect(result.customer_type).toBe('Company');
  });

  it('maps inactive status to disabled=1', () => {
    const result = toErpCustomer(makeInput({ status: 'inactive' }));
    expect(result.disabled).toBe(1);
  });

  it('maps active status to disabled=0', () => {
    const result = toErpCustomer(makeInput({ status: 'active' }));
    expect(result.disabled).toBe(0);
  });

  it('maps null status to disabled=0', () => {
    const result = toErpCustomer(makeInput({ status: null }));
    expect(result.disabled).toBe(0);
  });

  it('serialises billing_address as JSON string', () => {
    const result = toErpCustomer(makeInput());
    expect(result.primary_address).toContain('Mississauga');
    expect(typeof result.primary_address).toBe('string');
  });

  it('sets primary_address to null when billing_address is null', () => {
    const result = toErpCustomer(makeInput({ billing_address: null }));
    expect(result.primary_address).toBeNull();
  });

  it('defaults division to empty string when null', () => {
    const result = toErpCustomer(makeInput({ division_id: null }));
    expect(result.custom_division).toBe('');
  });

  it('defaults website and industry to empty string when null', () => {
    const result = toErpCustomer(makeInput({ website: null, industry: null }));
    expect(result.website).toBe('');
    expect(result.industry).toBe('');
  });

  it('handles special characters in account_name', () => {
    const result = toErpCustomer(
      makeInput({ account_name: "O'Brien & Sons (Canada) Ltd." }),
    );
    expect(result.customer_name).toBe("O'Brien & Sons (Canada) Ltd.");
  });

  it('handles minimal input with all optional fields null', () => {
    const result = toErpCustomer(
      makeInput({
        account_type: null,
        division_id: null,
        status: null,
        billing_address: null,
        phone: null,
        website: null,
        industry: null,
      }),
    );
    expect(result.customer_name).toBe('Acme Construction Ltd.');
    expect(result.custom_mdm_account_id).toBe('acct-001');
    expect(result.customer_type).toBe('Company');
    expect(result.disabled).toBe(0);
  });
});

describe('fromErpCustomer', () => {
  it('maps all fields correctly from ERPNext Customer', () => {
    const result = fromErpCustomer({
      name: 'CUST-00001',
      customer_name: 'Acme Construction Ltd.',
      customer_type: 'Company',
      disabled: 0,
      custom_division: 'contracting',
      website: 'https://acme.ca',
      industry: 'Construction',
    });
    expect(result.account_name).toBe('Acme Construction Ltd.');
    expect(result.account_type).toBe('client');
    expect(result.status).toBe('active');
    expect(result.division_id).toBe('contracting');
    expect(result.website).toBe('https://acme.ca');
    expect(result.industry).toBe('Construction');
    expect(result.erp_docname).toBe('CUST-00001');
  });

  it('maps Individual customer_type to individual account_type', () => {
    const result = fromErpCustomer({
      customer_type: 'Individual',
    });
    expect(result.account_type).toBe('individual');
  });

  it('maps disabled=1 to inactive status', () => {
    const result = fromErpCustomer({
      disabled: 1,
    });
    expect(result.status).toBe('inactive');
  });

  it('maps disabled=true to inactive status', () => {
    const result = fromErpCustomer({
      disabled: true,
    });
    expect(result.status).toBe('inactive');
  });

  it('handles missing fields gracefully', () => {
    const result = fromErpCustomer({});
    expect(result.account_name).toBe('');
    expect(result.account_type).toBe('client');
    expect(result.status).toBe('active');
    expect(result.division_id).toBeNull();
    expect(result.website).toBeNull();
    expect(result.industry).toBeNull();
    expect(result.erp_docname).toBeNull();
  });

  it('handles null custom_division', () => {
    const result = fromErpCustomer({
      custom_division: null,
    });
    expect(result.division_id).toBeNull();
  });
});
