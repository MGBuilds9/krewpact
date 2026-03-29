import { describe, expect, it } from 'vitest';

import { mapCompanyFromErp, mapCompanyToErp } from '@/lib/erp/company-mapper';

describe('mapCompanyFromErp', () => {
  it('maps all fields correctly', () => {
    const result = mapCompanyFromErp({
      name: 'MDM Group Inc.',
      company_name: 'MDM Group Inc.',
      abbr: 'MDM',
      default_currency: 'CAD',
      country: 'Canada',
      domain: 'Manufacturing',
      creation: '2026-01-01T00:00:00',
      modified: '2026-01-01T00:00:00',
    });

    expect(result.erp_name).toBe('MDM Group Inc.');
    expect(result.company_name).toBe('MDM Group Inc.');
    expect(result.abbreviation).toBe('MDM');
    expect(result.default_currency).toBe('CAD');
    expect(result.country).toBe('Canada');
  });
});

describe('mapCompanyToErp', () => {
  it('maps all fields correctly', () => {
    const result = mapCompanyToErp({
      id: 'org-001',
      company_name: 'MDM Group Inc.',
      abbreviation: 'MDM',
      default_currency: 'CAD',
      country: 'Canada',
    });

    expect(result.company_name).toBe('MDM Group Inc.');
    expect(result.abbr).toBe('MDM');
    expect(result.default_currency).toBe('CAD');
    expect(result.country).toBe('Canada');
    expect(result.krewpact_id).toBe('org-001');
  });

  it('defaults currency to CAD when empty', () => {
    const result = mapCompanyToErp({
      id: 'org-001',
      company_name: 'Test Co',
      abbreviation: 'TC',
      default_currency: '',
      country: '',
    });

    expect(result.default_currency).toBe('CAD');
    expect(result.country).toBe('Canada');
  });
});
