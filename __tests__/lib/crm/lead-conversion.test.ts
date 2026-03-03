import { describe, it, expect } from 'vitest';
import { validateConversion } from '@/lib/crm/lead-conversion';
import type { ConversionInput } from '@/lib/crm/lead-conversion';

function makeInput(overrides: Partial<ConversionInput> = {}): ConversionInput {
  return {
    lead: {
      id: 'lead-1',
      stage: 'won',
      lead_name: 'Big Project',
      division_id: 'div-1',
      estimated_value: 50000,
      company_name: 'ABC Corp',
      email: 'test@example.com',
      phone: '416-555-0100',
      source_channel: 'website',
    },
    existingOpportunityForLead: false,
    ...overrides,
  };
}

describe('validateConversion', () => {
  it('returns valid for won lead with no existing opportunity', () => {
    const result = validateConversion(makeInput());
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.opportunityData.opportunity_name).toBe('Big Project');
      expect(result.opportunityData.lead_id).toBe('lead-1');
      expect(result.opportunityData.stage).toBe('intake');
      expect(result.opportunityData.estimated_revenue).toBe(50000);
      expect(result.opportunityData.division_id).toBe('div-1');
    }
  });

  it('rejects lead not in won stage', () => {
    const result = validateConversion(
      makeInput({
        lead: { ...makeInput().lead, stage: 'new' },
      }),
    );
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toContain('won');
      expect(result.reason).toContain('new');
    }
  });

  it('rejects lead already converted', () => {
    const result = validateConversion(
      makeInput({
        existingOpportunityForLead: true,
      }),
    );
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toContain('already been converted');
    }
  });

  it('passes account_id and contact_id through', () => {
    const result = validateConversion(
      makeInput({
        accountId: 'acct-1',
        contactId: 'contact-1',
      }),
    );
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.opportunityData.account_id).toBe('acct-1');
      expect(result.opportunityData.contact_id).toBe('contact-1');
    }
  });

  it('defaults account_id and contact_id to null', () => {
    const result = validateConversion(makeInput());
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.opportunityData.account_id).toBeNull();
      expect(result.opportunityData.contact_id).toBeNull();
    }
  });

  it('handles null estimated_value', () => {
    const result = validateConversion(
      makeInput({
        lead: { ...makeInput().lead, estimated_value: null },
      }),
    );
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.opportunityData.estimated_revenue).toBeNull();
    }
  });

  it('handles null division_id', () => {
    const result = validateConversion(
      makeInput({
        lead: { ...makeInput().lead, division_id: null },
      }),
    );
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.opportunityData.division_id).toBeNull();
    }
  });
});
