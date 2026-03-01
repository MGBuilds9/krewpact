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
import { GET, POST } from '@/app/api/crm/opportunities/route';
import {
  GET as GET_ID,
  PATCH,
  DELETE,
} from '@/app/api/crm/opportunities/[id]/route';
import {
  mockSupabaseClient,
  mockClerkAuth,
  mockClerkUnauth,
  makeRequest,
  makeJsonRequest,
  makeOpportunity,
  resetFixtureCounter,
} from '@/__tests__/helpers';

const mockAuth = vi.mocked(auth);
const mockCreateUserClient = vi.mocked(createUserClient);

function makeContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

// ============================================================
// GET /api/crm/opportunities
// ============================================================
describe('GET /api/crm/opportunities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFixtureCounter();
  });

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const res = await GET(makeRequest('/api/crm/opportunities'));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns opportunities list', async () => {
    const opportunities = [
      makeOpportunity(),
      makeOpportunity({ opportunity_name: 'Second Opportunity' }),
    ];
    mockClerkAuth(mockAuth);
    mockCreateUserClient.mockResolvedValue(
      mockSupabaseClient({
        tables: { opportunities: { data: opportunities, error: null } },
      }),
    );

    const res = await GET(makeRequest('/api/crm/opportunities'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual(opportunities);
  });

  it('filters by division_id', async () => {
    const opportunities = [makeOpportunity()];
    mockClerkAuth(mockAuth);
    const client = mockSupabaseClient({
      tables: { opportunities: { data: opportunities, error: null } },
    });
    mockCreateUserClient.mockResolvedValue(client);

    const res = await GET(
      makeRequest(
        '/api/crm/opportunities?division_id=a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      ),
    );
    expect(res.status).toBe(200);
    expect(client.from).toHaveBeenCalledWith('opportunities');
  });

  it('filters by stage', async () => {
    const opportunities = [makeOpportunity({ stage: 'proposal' })];
    mockClerkAuth(mockAuth);
    const client = mockSupabaseClient({
      tables: { opportunities: { data: opportunities, error: null } },
    });
    mockCreateUserClient.mockResolvedValue(client);

    const res = await GET(
      makeRequest('/api/crm/opportunities?stage=proposal'),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual(opportunities);
  });

  it('filters by owner_user_id', async () => {
    const opportunities = [makeOpportunity()];
    mockClerkAuth(mockAuth);
    const client = mockSupabaseClient({
      tables: { opportunities: { data: opportunities, error: null } },
    });
    mockCreateUserClient.mockResolvedValue(client);

    const res = await GET(
      makeRequest(
        '/api/crm/opportunities?owner_user_id=a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      ),
    );
    expect(res.status).toBe(200);
    expect(client.from).toHaveBeenCalledWith('opportunities');
  });

  it('returns pipeline view when view=pipeline', async () => {
    const opportunities = [
      makeOpportunity({ stage: 'intake', estimated_revenue: 100000 }),
      makeOpportunity({ stage: 'intake', estimated_revenue: 50000 }),
      makeOpportunity({ stage: 'proposal', estimated_revenue: 200000 }),
    ];
    mockClerkAuth(mockAuth);
    mockCreateUserClient.mockResolvedValue(
      mockSupabaseClient({
        tables: { opportunities: { data: opportunities, error: null } },
      }),
    );

    const res = await GET(
      makeRequest('/api/crm/opportunities?view=pipeline'),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.stages).toBeDefined();
    expect(body.stages.intake.count).toBe(2);
    expect(body.stages.intake.total_value).toBe(150000);
    expect(body.stages.proposal.count).toBe(1);
    expect(body.stages.proposal.total_value).toBe(200000);
  });
});

// ============================================================
// POST /api/crm/opportunities
// ============================================================
describe('POST /api/crm/opportunities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFixtureCounter();
  });

  it('creates opportunity', async () => {
    const created = makeOpportunity();
    mockClerkAuth(mockAuth);
    mockCreateUserClient.mockResolvedValue(
      mockSupabaseClient({
        tables: { opportunities: { data: created, error: null } },
      }),
    );

    const res = await POST(
      makeJsonRequest('/api/crm/opportunities', {
        opportunity_name: 'New Opportunity',
      }),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.opportunity_name).toBe('Renovation Phase 1');
  });

  it('creates opportunity linked to lead and account', async () => {
    const created = makeOpportunity({
      lead_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      account_id: 'b1ffcd00-0d1c-4ef9-bb7e-7cc0ce491b22',
    });
    mockClerkAuth(mockAuth);
    mockCreateUserClient.mockResolvedValue(
      mockSupabaseClient({
        tables: { opportunities: { data: created, error: null } },
      }),
    );

    const res = await POST(
      makeJsonRequest('/api/crm/opportunities', {
        opportunity_name: 'Linked Opportunity',
        lead_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        account_id: 'b1ffcd00-0d1c-4ef9-bb7e-7cc0ce491b22',
      }),
    );
    expect(res.status).toBe(201);
  });

  it('returns 400 for invalid data', async () => {
    mockClerkAuth(mockAuth);
    const res = await POST(
      makeJsonRequest('/api/crm/opportunities', { stage: 'intake' }),
    );
    expect(res.status).toBe(400);
  });
});

// ============================================================
// GET /api/crm/opportunities/[id]
// ============================================================
describe('GET /api/crm/opportunities/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFixtureCounter();
  });

  it('returns opportunity with stage_history', async () => {
    const opportunity = makeOpportunity();
    const stageHistory = [
      {
        id: 'h1',
        opportunity_id: opportunity.id,
        from_stage: 'intake',
        to_stage: 'site_visit',
        changed_by: opportunity.owner_user_id,
        changed_at: '2026-01-15T00:00:00Z',
      },
    ];
    mockClerkAuth(mockAuth);
    mockCreateUserClient.mockResolvedValue(
      mockSupabaseClient({
        tables: {
          opportunities: { data: { ...opportunity, opportunity_stage_history: stageHistory }, error: null },
        },
      }),
    );

    const res = await GET_ID(
      makeRequest('/api/crm/opportunities/123'),
      makeContext(opportunity.id),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.opportunity_name).toBe('Renovation Phase 1');
    expect(body.opportunity_stage_history).toBeDefined();
  });

  it('returns 404 for non-existent opportunity', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClient.mockResolvedValue(
      mockSupabaseClient({
        tables: {
          opportunities: {
            data: null,
            error: { message: 'Row not found', code: 'PGRST116' },
          },
        },
      }),
    );

    const res = await GET_ID(
      makeRequest('/api/crm/opportunities/nonexistent'),
      makeContext('nonexistent'),
    );
    expect(res.status).toBe(404);
  });
});

// ============================================================
// PATCH /api/crm/opportunities/[id]
// ============================================================
describe('PATCH /api/crm/opportunities/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFixtureCounter();
  });

  it('updates opportunity', async () => {
    const updated = makeOpportunity({ opportunity_name: 'Updated Opportunity' });
    mockClerkAuth(mockAuth);
    mockCreateUserClient.mockResolvedValue(
      mockSupabaseClient({
        tables: { opportunities: { data: updated, error: null } },
      }),
    );

    const res = await PATCH(
      makeJsonRequest(
        '/api/crm/opportunities/123',
        { opportunity_name: 'Updated Opportunity' },
        'PATCH',
      ),
      makeContext(updated.id),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.opportunity_name).toBe('Updated Opportunity');
  });

  it('records stage history when stage changes', async () => {
    const currentOpp = makeOpportunity({ stage: 'intake' });
    mockClerkAuth(mockAuth);

    // Mock client needs to handle:
    // 1. SELECT current opportunity to detect stage change
    // 2. INSERT into opportunity_stage_history
    // 3. UPDATE the opportunity
    const client = mockSupabaseClient({
      tables: {
        opportunities: { data: currentOpp, error: null },
        opportunity_stage_history: { data: { id: 'history-1' }, error: null },
      },
    });
    mockCreateUserClient.mockResolvedValue(client);

    const res = await PATCH(
      makeJsonRequest(
        '/api/crm/opportunities/123',
        { stage: 'site_visit' },
        'PATCH',
      ),
      makeContext(currentOpp.id),
    );
    expect(res.status).toBe(200);
    // Verify the history table was written to
    expect(client.from).toHaveBeenCalledWith('opportunity_stage_history');
  });

  it('does not record stage history when stage unchanged', async () => {
    const currentOpp = makeOpportunity({ stage: 'intake' });
    mockClerkAuth(mockAuth);

    const client = mockSupabaseClient({
      tables: {
        opportunities: { data: currentOpp, error: null },
      },
    });
    mockCreateUserClient.mockResolvedValue(client);

    const res = await PATCH(
      makeJsonRequest(
        '/api/crm/opportunities/123',
        { opportunity_name: 'Same Stage' },
        'PATCH',
      ),
      makeContext(currentOpp.id),
    );
    expect(res.status).toBe(200);
    // from() should be called for 'opportunities' but NOT for 'opportunity_stage_history'
    const fromCalls = (client.from as ReturnType<typeof vi.fn>).mock.calls.map(
      (c: unknown[]) => c[0],
    );
    expect(fromCalls).not.toContain('opportunity_stage_history');
  });
});

// ============================================================
// DELETE /api/crm/opportunities/[id]
// ============================================================
describe('DELETE /api/crm/opportunities/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFixtureCounter();
  });

  it('deletes opportunity', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClient.mockResolvedValue(
      mockSupabaseClient({
        tables: { opportunities: { data: null, error: null } },
      }),
    );

    const res = await DELETE(
      makeRequest('/api/crm/opportunities/123'),
      makeContext('some-id'),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});
