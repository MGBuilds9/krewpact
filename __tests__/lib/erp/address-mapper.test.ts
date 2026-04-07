import { describe, expect, it } from 'vitest';

import { toErpAddress } from '@/lib/erp/address-mapper';

describe('toErpAddress', () => {
  const baseInput = {
    ownerName: 'MDM Contracting Inc.',
    linkDoctype: 'Customer' as const,
    linkName: 'MDM-CUST-0001',
  };

  it('maps all fields correctly', () => {
    const address = {
      street: '123 Main St',
      suite: 'Unit 5',
      city: 'Mississauga',
      province: 'Ontario',
      postal_code: 'L5B 1M2',
      country: 'Canada',
    };

    const result = toErpAddress({ ...baseInput, address });

    expect(result).toEqual({
      address_title: 'MDM Contracting Inc.',
      address_type: 'Billing',
      address_line1: '123 Main St',
      address_line2: 'Unit 5',
      city: 'Mississauga',
      state: 'Ontario',
      pincode: 'L5B 1M2',
      country: 'Canada',
      is_primary_address: 1,
      links: [{ link_doctype: 'Customer', link_name: 'MDM-CUST-0001' }],
    });
  });

  it('handles missing optional suite field', () => {
    const address = {
      street: '456 King St W',
      city: 'Toronto',
      province: 'Ontario',
      postal_code: 'M5V 1M2',
    };

    const result = toErpAddress({ ...baseInput, address });

    expect(result).not.toBeNull();
    expect(result?.address_line2).toBe('');
    expect(result?.address_line1).toBe('456 King St W');
  });

  it('defaults country to Canada when not provided', () => {
    const address = {
      street: '789 Queen St',
      city: 'Hamilton',
      province: 'Ontario',
      postal_code: 'L8P 1A1',
    };

    const result = toErpAddress({ ...baseInput, address });

    expect(result?.country).toBe('Canada');
  });

  it('uses provided country when specified', () => {
    const address = {
      street: '10 Downing St',
      city: 'London',
      province: 'England',
      postal_code: 'SW1A 2AA',
      country: 'United Kingdom',
    };

    const result = toErpAddress({ ...baseInput, address });

    expect(result?.country).toBe('United Kingdom');
  });

  it('sets correct link doctype and name for Customer', () => {
    const address = {
      street: '1 Bay St',
      city: 'Toronto',
      province: 'Ontario',
      postal_code: 'M5J 2T3',
    };

    const result = toErpAddress({
      ...baseInput,
      address,
      linkDoctype: 'Customer',
      linkName: 'CUST-0042',
    });

    expect(result?.links).toEqual([{ link_doctype: 'Customer', link_name: 'CUST-0042' }]);
  });

  it('sets correct link doctype and name for Supplier', () => {
    const address = {
      street: '2 Front St',
      city: 'Brampton',
      province: 'Ontario',
      postal_code: 'L6T 4B3',
    };

    const result = toErpAddress({
      ...baseInput,
      address,
      linkDoctype: 'Supplier',
      linkName: 'SUPP-0007',
    });

    expect(result?.links).toEqual([{ link_doctype: 'Supplier', link_name: 'SUPP-0007' }]);
  });

  it('returns null when address object is empty', () => {
    const result = toErpAddress({ ...baseInput, address: {} });

    expect(result).toBeNull();
  });

  it('returns null when address has no meaningful fields', () => {
    const result = toErpAddress({ ...baseInput, address: { suite: 'Unit 3' } });

    expect(result).toBeNull();
  });

  it('sets is_primary_address to 1', () => {
    const address = {
      street: '100 City Centre Dr',
      city: 'Mississauga',
      province: 'Ontario',
      postal_code: 'L5B 2T4',
    };

    const result = toErpAddress({ ...baseInput, address });

    expect(result?.is_primary_address).toBe(1);
  });

  it('sets address_type to Billing', () => {
    const address = {
      street: '200 Dundas St E',
      city: 'Mississauga',
      province: 'Ontario',
      postal_code: 'L4X 2Z4',
    };

    const result = toErpAddress({ ...baseInput, address });

    expect(result?.address_type).toBe('Billing');
  });
});
