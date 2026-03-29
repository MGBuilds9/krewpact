import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/env', () => ({
  env: {},
}));

// Mock Clerk auth
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}));

// Mock Supabase server client
vi.mock('@/lib/supabase/server', () => ({
  createUserClientSafe: vi.fn(),
}));

// Mock the proposal generator (pure function tested separately)
vi.mock('@/lib/crm/proposal-generator', () => ({
  composeProposalData: vi.fn(),
}));

import { auth } from '@clerk/nextjs/server';

import {
  makeAccount,
  makeContact,
  makeEstimate,
  makeOpportunity,
  makeRequest,
  mockClerkAuth,
  mockClerkUnauth,
  mockSupabaseClient,
  resetFixtureCounter,
} from '@/__tests__/helpers';
import { GET } from '@/app/api/crm/opportunities/[id]/proposal/route';
import { composeProposalData } from '@/lib/crm/proposal-generator';
import { createUserClientSafe } from '@/lib/supabase/server';

const mockAuth = vi.mocked(auth);
const mockCreateUserClientSafe = vi.mocked(createUserClientSafe);
const mockComposeProposalData = vi.mocked(composeProposalData);

const OPP_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const ACCOUNT_ID = 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22';
const CONTACT_ID = 'c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33';

function makeContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe('GET /api/crm/opportunities/[id]/proposal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFixtureCounter();
    mockComposeProposalData.mockReturnValue({
      title: 'Proposal: Office Renovation',
      date: '2026-03-05',
      reference: OPP_ID,
      client: {
        company: 'Test Account Inc.',
        contactName: 'Jane Smith',
        contactEmail: 'jane@example.com',
        contactPhone: '416-555-0100',
        contactTitle: 'PM',
        address: null,
      },
      company: {
        name: 'Your Company',
        address: 'Configure COMPANY_ADDRESS in env',
        phone: 'Configure COMPANY_PHONE in env',
        email: 'Configure COMPANY_EMAIL in env',
      },
      estimates: [],
      totalEstimatedValue: 0,
    } as never);
  });

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const res = await GET(
      makeRequest(`/api/crm/opportunities/${OPP_ID}/proposal`),
      makeContext(OPP_ID),
    );
    expect(res!.status).toBe(401);
  });

  it('returns 404 when opportunity does not exist', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: {
          opportunities: {
            data: null,
            error: { message: 'Row not found', code: 'PGRST116' },
          },
        },
      }),
      error: null,
    });

    const res = await GET(
      makeRequest(`/api/crm/opportunities/${OPP_ID}/proposal`),
      makeContext(OPP_ID),
    );
    expect(res!.status).toBe(404);
  });

  it('returns proposal data with opportunity, account, contact, and estimates', async () => {
    const opportunity = makeOpportunity({
      id: OPP_ID,
      account_id: ACCOUNT_ID,
      contact_id: CONTACT_ID,
      opportunity_name: 'Office Renovation',
      estimated_revenue: 150000,
    });
    const account = makeAccount({ id: ACCOUNT_ID });
    const contact = makeContact({ id: CONTACT_ID });
    const estimates = [makeEstimate({ opportunity_id: OPP_ID, total_amount: 130000 })];

    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: {
          opportunities: { data: opportunity, error: null },
          accounts: { data: account, error: null },
          contacts: { data: contact, error: null },
          estimates: { data: estimates, error: null },
        },
      }),
      error: null,
    });

    const res = await GET(
      makeRequest(`/api/crm/opportunities/${OPP_ID}/proposal`),
      makeContext(OPP_ID),
    );
    expect(res!.status).toBe(200);
    expect(mockComposeProposalData).toHaveBeenCalledTimes(1);

    // Verify the input to composeProposalData includes opportunity data
    const callArg = mockComposeProposalData.mock.calls[0][0];
    expect(callArg.opportunity.id).toBe(OPP_ID);
  });

  it('handles opportunity with no account or contact', async () => {
    const opportunity = makeOpportunity({
      id: OPP_ID,
      account_id: null,
      contact_id: null,
      opportunity_name: 'Quick Estimate',
    });

    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: {
          opportunities: { data: opportunity, error: null },
          estimates: { data: [], error: null },
        },
      }),
      error: null,
    });

    const res = await GET(
      makeRequest(`/api/crm/opportunities/${OPP_ID}/proposal`),
      makeContext(OPP_ID),
    );
    expect(res!.status).toBe(200);

    const callArg = mockComposeProposalData.mock.calls[0][0];
    expect(callArg.account).toBeNull();
    expect(callArg.contact).toBeNull();
  });

  it('includes linked estimates in proposal data', async () => {
    const opportunity = makeOpportunity({
      id: OPP_ID,
      account_id: null,
      contact_id: null,
    });
    const estimates = [
      makeEstimate({ opportunity_id: OPP_ID, total_amount: 50000, status: 'approved' }),
      makeEstimate({ opportunity_id: OPP_ID, total_amount: 75000, status: 'draft' }),
    ];

    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: {
          opportunities: { data: opportunity, error: null },
          estimates: { data: estimates, error: null },
        },
      }),
      error: null,
    });

    const res = await GET(
      makeRequest(`/api/crm/opportunities/${OPP_ID}/proposal`),
      makeContext(OPP_ID),
    );
    expect(res!.status).toBe(200);

    const callArg = mockComposeProposalData.mock.calls[0][0];
    expect(callArg.estimates).toHaveLength(2);
  });

  it('passes company info to composeProposalData', async () => {
    const opportunity = makeOpportunity({
      id: OPP_ID,
      account_id: null,
      contact_id: null,
    });

    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: {
          opportunities: { data: opportunity, error: null },
          estimates: { data: [], error: null },
        },
      }),
      error: null,
    });

    const res = await GET(
      makeRequest(`/api/crm/opportunities/${OPP_ID}/proposal`),
      makeContext(OPP_ID),
    );
    expect(res!.status).toBe(200);

    const callArg = mockComposeProposalData.mock.calls[0][0];
    expect(callArg.companyInfo).toBeDefined();
    expect(callArg.companyInfo.name).toBe('Your Company');
  });
});
