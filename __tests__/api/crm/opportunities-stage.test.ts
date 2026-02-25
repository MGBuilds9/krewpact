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
import { POST } from '@/app/api/crm/opportunities/[id]/stage/route';
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

describe('POST /api/crm/opportunities/[id]/stage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFixtureCounter();
  });

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const res = await POST(
      makeJsonRequest('/api/crm/opportunities/123/stage', { stage: 'site_visit' }),
      makeContext('some-id'),
    );
    expect(res.status).toBe(401);
  });

  it('transitions intake -> site_visit', async () => {
    const opp = makeOpportunity({ stage: 'intake' });
    mockClerkAuth(mockAuth);
    mockCreateUserClient.mockResolvedValue(
      mockSupabaseClient({
        tables: { opportunities: { data: opp, error: null } },
      }),
    );

    const res = await POST(
      makeJsonRequest('/api/crm/opportunities/123/stage', { stage: 'site_visit' }),
      makeContext(opp.id),
    );
    expect(res.status).toBe(200);
  });

  it('transitions site_visit -> estimating', async () => {
    const opp = makeOpportunity({ stage: 'site_visit' });
    mockClerkAuth(mockAuth);
    mockCreateUserClient.mockResolvedValue(
      mockSupabaseClient({
        tables: { opportunities: { data: opp, error: null } },
      }),
    );

    const res = await POST(
      makeJsonRequest('/api/crm/opportunities/123/stage', { stage: 'estimating' }),
      makeContext(opp.id),
    );
    expect(res.status).toBe(200);
  });

  it('transitions negotiation -> contracted', async () => {
    const opp = makeOpportunity({ stage: 'negotiation' });
    mockClerkAuth(mockAuth);
    mockCreateUserClient.mockResolvedValue(
      mockSupabaseClient({
        tables: { opportunities: { data: opp, error: null } },
      }),
    );

    const res = await POST(
      makeJsonRequest('/api/crm/opportunities/123/stage', { stage: 'contracted' }),
      makeContext(opp.id),
    );
    expect(res.status).toBe(200);
  });

  it('transitions any -> closed_lost (with lost_reason)', async () => {
    const opp = makeOpportunity({ stage: 'proposal' });
    mockClerkAuth(mockAuth);
    mockCreateUserClient.mockResolvedValue(
      mockSupabaseClient({
        tables: { opportunities: { data: opp, error: null } },
      }),
    );

    const res = await POST(
      makeJsonRequest('/api/crm/opportunities/123/stage', {
        stage: 'closed_lost',
        lost_reason: 'Client went with competitor',
      }),
      makeContext(opp.id),
    );
    expect(res.status).toBe(200);
  });

  it('rejects intake -> contracted (skip stages)', async () => {
    const opp = makeOpportunity({ stage: 'intake' });
    mockClerkAuth(mockAuth);
    mockCreateUserClient.mockResolvedValue(
      mockSupabaseClient({
        tables: { opportunities: { data: opp, error: null } },
      }),
    );

    const res = await POST(
      makeJsonRequest('/api/crm/opportunities/123/stage', { stage: 'contracted' }),
      makeContext(opp.id),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('not allowed');
  });

  it('rejects contracted -> intake (terminal)', async () => {
    const opp = makeOpportunity({ stage: 'contracted' });
    mockClerkAuth(mockAuth);
    mockCreateUserClient.mockResolvedValue(
      mockSupabaseClient({
        tables: { opportunities: { data: opp, error: null } },
      }),
    );

    const res = await POST(
      makeJsonRequest('/api/crm/opportunities/123/stage', { stage: 'intake' }),
      makeContext(opp.id),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('terminal');
  });

  it('rejects closed_lost without lost_reason', async () => {
    const opp = makeOpportunity({ stage: 'intake' });
    mockClerkAuth(mockAuth);
    mockCreateUserClient.mockResolvedValue(
      mockSupabaseClient({
        tables: { opportunities: { data: opp, error: null } },
      }),
    );

    const res = await POST(
      makeJsonRequest('/api/crm/opportunities/123/stage', { stage: 'closed_lost' }),
      makeContext(opp.id),
    );
    expect(res.status).toBe(400);
  });

  it('rejects invalid stage enum value', async () => {
    mockClerkAuth(mockAuth);
    const res = await POST(
      makeJsonRequest('/api/crm/opportunities/123/stage', { stage: 'invalid_stage' }),
      makeContext('some-id'),
    );
    expect(res.status).toBe(400);
  });
});
