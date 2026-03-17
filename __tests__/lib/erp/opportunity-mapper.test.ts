import { describe, expect, it } from 'vitest';

import { mapOpportunityToErp, type OpportunityMapInput } from '@/lib/erp/opportunity-mapper';

function makeInput(overrides: Partial<OpportunityMapInput> = {}): OpportunityMapInput {
  return {
    id: 'opp-001',
    opportunity_name: 'MDM Contracting - Office Reno',
    estimated_revenue: 150000,
    probability_pct: 75,
    target_close_date: '2026-04-15',
    division_id: 'div-contracting',
    account_id: 'acct-001',
    ...overrides,
  };
}

describe('mapOpportunityToErp', () => {
  it('maps all fields correctly', () => {
    const result = mapOpportunityToErp(makeInput());
    expect(result).toEqual({
      opportunity_from: 'Customer',
      party_name: 'acct-001',
      opportunity_type: 'Sales',
      status: 'Open',
      expected_closing: '2026-04-15',
      opportunity_amount: 150000,
      probability: 75,
      currency: 'CAD',
      krewpact_id: 'opp-001',
      title: 'MDM Contracting - Office Reno',
    });
  });

  it('defaults opportunity_amount to 0 when estimated_revenue is null', () => {
    const result = mapOpportunityToErp(makeInput({ estimated_revenue: null }));
    expect(result.opportunity_amount).toBe(0);
  });

  it('defaults probability to 0 when probability_pct is null', () => {
    const result = mapOpportunityToErp(makeInput({ probability_pct: null }));
    expect(result.probability).toBe(0);
  });

  it('uses empty string for party_name when account_id is null', () => {
    const result = mapOpportunityToErp(makeInput({ account_id: null }));
    expect(result.party_name).toBe('');
  });

  it('passes through null target_close_date', () => {
    const result = mapOpportunityToErp(makeInput({ target_close_date: null }));
    expect(result.expected_closing).toBeNull();
  });

  it('always sets currency to CAD', () => {
    const result = mapOpportunityToErp(makeInput());
    expect(result.currency).toBe('CAD');
  });
});
