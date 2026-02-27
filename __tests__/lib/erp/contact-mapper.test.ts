import { describe, it, expect } from 'vitest';
import { mapContactToErp, type ContactMapInput } from '@/lib/erp/contact-mapper';

function makeInput(overrides: Partial<ContactMapInput> = {}): ContactMapInput {
  return {
    id: 'cont-001',
    first_name: 'Jane',
    last_name: 'Smith',
    email: 'jane.smith@mdmgroup.ca',
    phone: '905-555-0100',
    role_title: 'Project Manager',
    account_id: 'acct-001',
    ...overrides,
  };
}

describe('mapContactToErp', () => {
  it('maps all fields correctly', () => {
    const result = mapContactToErp(makeInput());
    expect(result.first_name).toBe('Jane');
    expect(result.last_name).toBe('Smith');
    expect(result.full_name).toBe('Jane Smith');
    expect(result.designation).toBe('Project Manager');
    expect(result.krewpact_id).toBe('cont-001');
  });

  it('links to Customer when account_id is set', () => {
    const result = mapContactToErp(makeInput());
    expect(result.links).toEqual([{ link_doctype: 'Customer', link_name: 'acct-001' }]);
  });

  it('sets empty links array when account_id is null', () => {
    const result = mapContactToErp(makeInput({ account_id: null }));
    expect(result.links).toEqual([]);
  });

  it('sets primary email correctly', () => {
    const result = mapContactToErp(makeInput());
    expect(result.email_ids).toEqual([{ email_id: 'jane.smith@mdmgroup.ca', is_primary: 1 }]);
  });

  it('sets empty email_ids when email is null', () => {
    const result = mapContactToErp(makeInput({ email: null }));
    expect(result.email_ids).toEqual([]);
  });

  it('sets primary phone correctly', () => {
    const result = mapContactToErp(makeInput());
    expect(result.phone_nos).toEqual([{ phone: '905-555-0100', is_primary_phone: 1 }]);
  });

  it('sets empty phone_nos when phone is null', () => {
    const result = mapContactToErp(makeInput({ phone: null }));
    expect(result.phone_nos).toEqual([]);
  });

  it('defaults designation to empty string when role_title is null', () => {
    const result = mapContactToErp(makeInput({ role_title: null }));
    expect(result.designation).toBe('');
  });

  it('builds correct full_name from first and last', () => {
    const result = mapContactToErp(makeInput({ first_name: 'Michael', last_name: 'Guirguis' }));
    expect(result.full_name).toBe('Michael Guirguis');
  });
});
