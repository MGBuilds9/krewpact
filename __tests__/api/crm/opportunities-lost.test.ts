import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock Clerk auth
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}));

// Mock Supabase server client
vi.mock('@/lib/supabase/server', () => ({
  createUserClientSafe: vi.fn(),
}));

import { auth } from '@clerk/nextjs/server';

import {
  makeJsonRequest,
  makeOpportunity,
  mockClerkAuth,
  mockClerkUnauth,
  mockSupabaseClient,
  resetFixtureCounter,
} from '@/__tests__/helpers';
import { POST } from '@/app/api/crm/opportunities/[id]/lost/route';
import { createUserClientSafe } from '@/lib/supabase/server';

const mockAuth = vi.mocked(auth);
const mockCreateUserClientSafe = vi.mocked(createUserClientSafe);

function makeContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe('POST /api/crm/opportunities/[id]/lost', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFixtureCounter();
  });

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const res = await POST(
      makeJsonRequest('/api/crm/opportunities/123/lost', { lost_reason: 'Budget' }),
      makeContext('some-id'),
    );
    expect(res.status).toBe(401);
  });

  it('marks opportunity as lost with reason', async () => {
    const opp = makeOpportunity({ stage: 'proposal' });
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: {
          opportunities: { data: opp, error: null },
          opportunity_stage_history: { data: { id: 'hist-1' }, error: null },
          activities: { data: { id: 'act-1' }, error: null },
        },
      }),
      error: null,
    });

    const res = await POST(
      makeJsonRequest('/api/crm/opportunities/123/lost', {
        lost_reason: 'Budget',
        lost_notes: 'Client ran out of funding',
      }),
      makeContext(opp.id),
    );
    expect(res.status).toBe(200);
  });

  it('rejects already closed_lost opportunity', async () => {
    const opp = makeOpportunity({ stage: 'closed_lost' });
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { opportunities: { data: opp, error: null } },
      }),
      error: null,
    });

    const res = await POST(
      makeJsonRequest('/api/crm/opportunities/123/lost', {
        lost_reason: 'Budget',
      }),
      makeContext(opp.id),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.message).toContain('already');
  });

  it('rejects missing lost_reason', async () => {
    mockClerkAuth(mockAuth);
    const res = await POST(
      makeJsonRequest('/api/crm/opportunities/123/lost', {}),
      makeContext('some-id'),
    );
    expect(res.status).toBe(400);
  });

  it('creates a new lead when reopen_as_lead is true', async () => {
    const opp = makeOpportunity({
      stage: 'negotiation',
      opportunity_name: 'Big Project',
      estimated_revenue: 200000,
    });
    mockClerkAuth(mockAuth);
    const client = mockSupabaseClient({
      tables: {
        opportunities: { data: opp, error: null },
        opportunity_stage_history: { data: { id: 'hist-1' }, error: null },
        activities: { data: { id: 'act-1' }, error: null },
        leads: { data: { id: 'new-lead-1', lead_name: 'Big Project (Re-nurture)' }, error: null },
      },
    });
    mockCreateUserClientSafe.mockResolvedValue({ client: client, error: null });

    const res = await POST(
      makeJsonRequest('/api/crm/opportunities/123/lost', {
        lost_reason: 'Competition',
        reopen_as_lead: true,
      }),
      makeContext(opp.id),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.new_lead).toBeDefined();
  });

  it('returns 404 for non-existent opportunity', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: {
          opportunities: { data: null, error: { message: 'Not found', code: 'PGRST116' } },
        },
      }),
      error: null,
    });

    const res = await POST(
      makeJsonRequest('/api/crm/opportunities/123/lost', {
        lost_reason: 'Budget',
      }),
      makeContext('nonexistent'),
    );
    expect(res.status).toBe(404);
  });
});
