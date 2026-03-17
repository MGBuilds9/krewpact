import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { composeProposalData, type ProposalInput } from '@/lib/crm/proposal-generator';

function makeInput(overrides: Partial<ProposalInput> = {}): ProposalInput {
  return {
    opportunity: {
      id: 'abcd1234-0000-0000-0000-000000000000',
      opportunity_name: 'Kitchen Renovation',
      estimated_revenue: 50000,
      target_close_date: '2026-06-15',
      stage: 'proposal',
    },
    account: {
      id: 'acc-1',
      account_name: 'Acme Corp',
      billing_address: {
        street: '123 Main St',
        city: 'Toronto',
        province: 'ON',
        postal_code: 'M5V 2T6',
      },
    },
    contact: {
      id: 'con-1',
      first_name: 'Jane',
      last_name: 'Doe',
      email: 'jane@acme.com',
      phone: '416-555-1234',
      title: 'VP Operations',
    },
    estimates: [
      { id: 'est-1', estimate_number: 'EST-001', total_amount: 30000, status: 'approved' },
      { id: 'est-2', estimate_number: 'EST-002', total_amount: 20000, status: 'draft' },
    ],
    companyInfo: {
      name: 'MDM Group Inc.',
      address: '2233 Argentia Road',
      phone: '905-542-2950',
      email: 'info@mdmgroupinc.ca',
    },
    ...overrides,
  };
}

describe('composeProposalData', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-15T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('composes a full proposal from all inputs', () => {
    const result = composeProposalData(makeInput());
    expect(result.title).toBe('Proposal: Kitchen Renovation');
    expect(result.date).toBe('2026-03-15');
    expect(result.reference).toBe('PROP-ABCD1234');
    expect(result.client.company).toBe('Acme Corp');
    expect(result.client.contactName).toBe('Jane Doe');
    expect(result.client.contactEmail).toBe('jane@acme.com');
    expect(result.client.contactTitle).toBe('VP Operations');
    expect(result.client.address).toBe('123 Main St, Toronto, ON, M5V 2T6');
    expect(result.provider.name).toBe('MDM Group Inc.');
    expect(result.scope.description).toBe('Kitchen Renovation');
    expect(result.scope.estimatedValue).toBe(50000);
    expect(result.scope.targetDate).toBe('2026-06-15');
    expect(result.estimates).toHaveLength(2);
    expect(result.totalValue).toBe(50000); // 30000 + 20000
  });

  it('uses estimate total when estimates exist', () => {
    const result = composeProposalData(
      makeInput({
        estimates: [
          { id: 'est-1', estimate_number: 'EST-001', total_amount: 75000, status: 'approved' },
        ],
      }),
    );
    expect(result.totalValue).toBe(75000);
  });

  it('falls back to estimated_revenue when no estimates', () => {
    const result = composeProposalData(makeInput({ estimates: [] }));
    expect(result.totalValue).toBe(50000);
  });

  it('handles null account', () => {
    const result = composeProposalData(makeInput({ account: null }));
    expect(result.client.company).toBe('Unknown Company');
    expect(result.client.address).toBeNull();
  });

  it('handles null contact', () => {
    const result = composeProposalData(makeInput({ contact: null }));
    expect(result.client.contactName).toBeNull();
    expect(result.client.contactEmail).toBeNull();
    expect(result.client.contactPhone).toBeNull();
    expect(result.client.contactTitle).toBeNull();
  });

  it('handles null billing_address', () => {
    const result = composeProposalData(
      makeInput({
        account: { id: 'acc-1', account_name: 'Acme', billing_address: null },
      }),
    );
    expect(result.client.address).toBeNull();
  });

  it('returns zero total when no estimates and null revenue', () => {
    const result = composeProposalData(
      makeInput({
        opportunity: {
          id: 'abcd1234-0000-0000-0000-000000000000',
          opportunity_name: 'Test',
          estimated_revenue: null,
          target_close_date: null,
          stage: 'intake',
        },
        estimates: [],
      }),
    );
    expect(result.totalValue).toBe(0);
  });
});
