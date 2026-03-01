import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Clerk auth
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}));

// Mock Supabase server client
vi.mock('@/lib/supabase/server', () => ({
  createUserClient: vi.fn(),
}));

import { auth } from '@clerk/nextjs/server';
import { createUserClient } from '@/lib/supabase/server';
import { POST } from '@/app/api/crm/opportunities/[id]/lost/route';
import {
  mockSupabaseClient,
  mockClerkAuth,
  mockClerkUnauth,
  makeJsonRequest,
  makeOpportunity,
  resetFixtureCounter,
} from '@/__tests__/helpers';

const mockAuth = vi.mocked(auth);
const mockCreateUserClient = vi.mocked(createUserClient);

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
    mockCreateUserClient.mockResolvedValue(
      mockSupabaseClient({
        tables: {
          opportunities: { data: opp, error: null },
          opportunity_stage_history: { data: { id: 'hist-1' }, error: null },
          activities: { data: { id: 'act-1' }, error: null },
        },
      }),
    );

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
    mockCreateUserClient.mockResolvedValue(
      mockSupabaseClient({
        tables: { opportunities: { data: opp, error: null } },
      }),
    );

    const res = await POST(
      makeJsonRequest('/api/crm/opportunities/123/lost', {
        lost_reason: 'Budget',
      }),
      makeContext(opp.id),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('already');
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
    mockCreateUserClient.mockResolvedValue(client);

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
    mockCreateUserClient.mockResolvedValue(
      mockSupabaseClient({
        tables: {
          opportunities: { data: null, error: { message: 'Not found', code: 'PGRST116' } },
        },
      }),
    );

    const res = await POST(
      makeJsonRequest('/api/crm/opportunities/123/lost', {
        lost_reason: 'Budget',
      }),
      makeContext('nonexistent'),
    );
    expect(res.status).toBe(404);
  });
});
