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
import { GET, POST } from '@/app/api/crm/leads/route';
import {
  GET as GET_ID,
  PATCH,
  DELETE,
} from '@/app/api/crm/leads/[id]/route';
import { POST as STAGE_POST } from '@/app/api/crm/leads/[id]/stage/route';
import {
  mockSupabaseClient,
  mockClerkAuth,
  mockClerkUnauth,
  makeRequest,
  makeJsonRequest,
  makeLead,
  resetFixtureCounter,
} from '@/__tests__/helpers';

const mockAuth = vi.mocked(auth);
const mockCreateUserClient = vi.mocked(createUserClient);

function makeContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

// ============================================================
// GET /api/crm/leads
// ============================================================
describe('GET /api/crm/leads', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFixtureCounter();
  });

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const res = await GET(makeRequest('/api/crm/leads'));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns leads list', async () => {
    const leads = [makeLead(), makeLead({ lead_name: 'Second Lead' })];
    mockClerkAuth(mockAuth);
    mockCreateUserClient.mockResolvedValue(
      mockSupabaseClient({ tables: { leads: { data: leads, error: null } } }),
    );

    const res = await GET(makeRequest('/api/crm/leads'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual(leads);
  });

  it('filters by division_id', async () => {
    const leads = [makeLead()];
    mockClerkAuth(mockAuth);
    const client = mockSupabaseClient({
      tables: { leads: { data: leads, error: null } },
    });
    mockCreateUserClient.mockResolvedValue(client);

    const res = await GET(
      makeRequest(
        '/api/crm/leads?division_id=a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      ),
    );
    expect(res.status).toBe(200);
    expect(client.from).toHaveBeenCalledWith('leads');
  });

  it('filters by stage', async () => {
    const leads = [makeLead({ stage: 'qualified' })];
    mockClerkAuth(mockAuth);
    const client = mockSupabaseClient({
      tables: { leads: { data: leads, error: null } },
    });
    mockCreateUserClient.mockResolvedValue(client);

    const res = await GET(makeRequest('/api/crm/leads?stage=qualified'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual(leads);
  });

  it('filters by assigned_to', async () => {
    const leads = [makeLead()];
    mockClerkAuth(mockAuth);
    const client = mockSupabaseClient({
      tables: { leads: { data: leads, error: null } },
    });
    mockCreateUserClient.mockResolvedValue(client);

    const res = await GET(
      makeRequest(
        '/api/crm/leads?assigned_to=a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      ),
    );
    expect(res.status).toBe(200);
    expect(client.from).toHaveBeenCalledWith('leads');
  });

  it('filters by search', async () => {
    const leads = [makeLead({ lead_name: 'Big Construction' })];
    mockClerkAuth(mockAuth);
    const client = mockSupabaseClient({
      tables: { leads: { data: leads, error: null } },
    });
    mockCreateUserClient.mockResolvedValue(client);

    const res = await GET(makeRequest('/api/crm/leads?search=Construction'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual(leads);
  });
});

// ============================================================
// POST /api/crm/leads
// ============================================================
describe('POST /api/crm/leads', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFixtureCounter();
  });

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const res = await POST(
      makeJsonRequest('/api/crm/leads', { lead_name: 'Test Lead' }),
    );
    expect(res.status).toBe(401);
  });

  it('creates lead with default stage new', async () => {
    const created = makeLead({ stage: 'new' });
    mockClerkAuth(mockAuth);
    mockCreateUserClient.mockResolvedValue(
      mockSupabaseClient({ tables: { leads: { data: created, error: null } } }),
    );

    const res = await POST(
      makeJsonRequest('/api/crm/leads', { lead_name: 'Test Lead' }),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.stage).toBe('new');
  });

  it('creates lead with all optional fields', async () => {
    const created = makeLead({
      lead_name: 'Full Lead',
      company_name: 'Corp',
      email: 'test@example.com',
      estimated_value: 100000,
    });
    mockClerkAuth(mockAuth);
    mockCreateUserClient.mockResolvedValue(
      mockSupabaseClient({ tables: { leads: { data: created, error: null } } }),
    );

    const res = await POST(
      makeJsonRequest('/api/crm/leads', {
        lead_name: 'Full Lead',
        division_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        source: 'referral',
        company_name: 'Corp',
        email: 'test@example.com',
        phone: '416-555-0100',
        estimated_value: 100000,
        probability_pct: 75,
        assigned_to: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      }),
    );
    expect(res.status).toBe(201);
  });

  it('returns 400 for invalid data (missing lead_name)', async () => {
    mockClerkAuth(mockAuth);
    const res = await POST(
      makeJsonRequest('/api/crm/leads', { source: 'website' }),
    );
    expect(res.status).toBe(400);
  });
});

// ============================================================
// GET /api/crm/leads/[id]
// ============================================================
describe('GET /api/crm/leads/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFixtureCounter();
  });

  it('returns lead by id', async () => {
    const lead = makeLead();
    mockClerkAuth(mockAuth);
    mockCreateUserClient.mockResolvedValue(
      mockSupabaseClient({ tables: { leads: { data: lead, error: null } } }),
    );

    const res = await GET_ID(
      makeRequest('/api/crm/leads/123'),
      makeContext(lead.id),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.lead_name).toBe('Big Construction Project');
  });

  it('returns 404 for non-existent lead', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClient.mockResolvedValue(
      mockSupabaseClient({
        tables: {
          leads: {
            data: null,
            error: { message: 'Row not found', code: 'PGRST116' },
          },
        },
      }),
    );

    const res = await GET_ID(
      makeRequest('/api/crm/leads/nonexistent'),
      makeContext('nonexistent'),
    );
    expect(res.status).toBe(404);
  });
});

// ============================================================
// PATCH /api/crm/leads/[id]
// ============================================================
describe('PATCH /api/crm/leads/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFixtureCounter();
  });

  it('updates lead', async () => {
    const updated = makeLead({ lead_name: 'Updated Lead' });
    mockClerkAuth(mockAuth);
    mockCreateUserClient.mockResolvedValue(
      mockSupabaseClient({ tables: { leads: { data: updated, error: null } } }),
    );

    const res = await PATCH(
      makeJsonRequest(
        '/api/crm/leads/123',
        { lead_name: 'Updated Lead' },
        'PATCH',
      ),
      makeContext(updated.id),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.lead_name).toBe('Updated Lead');
  });
});

// ============================================================
// DELETE /api/crm/leads/[id]
// ============================================================
describe('DELETE /api/crm/leads/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFixtureCounter();
  });

  it('deletes lead', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClient.mockResolvedValue(
      mockSupabaseClient({ tables: { leads: { data: null, error: null } } }),
    );

    const res = await DELETE(
      makeRequest('/api/crm/leads/123'),
      makeContext('some-id'),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});

// ============================================================
// POST /api/crm/leads/[id]/stage — Stage transitions
// ============================================================
describe('POST /api/crm/leads/[id]/stage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFixtureCounter();
  });

  it('transitions new → qualified', async () => {
    const currentLead = makeLead({ stage: 'new' });
    mockClerkAuth(mockAuth);
    mockCreateUserClient.mockResolvedValue(
      mockSupabaseClient({
        tables: { leads: { data: currentLead, error: null } },
      }),
    );

    const res = await STAGE_POST(
      makeJsonRequest('/api/crm/leads/123/stage', { stage: 'qualified' }),
      makeContext(currentLead.id),
    );
    expect(res.status).toBe(200);
  });

  it('transitions qualified → estimating', async () => {
    const currentLead = makeLead({ stage: 'qualified' });
    mockClerkAuth(mockAuth);
    mockCreateUserClient.mockResolvedValue(
      mockSupabaseClient({
        tables: { leads: { data: currentLead, error: null } },
      }),
    );

    const res = await STAGE_POST(
      makeJsonRequest('/api/crm/leads/123/stage', { stage: 'estimating' }),
      makeContext(currentLead.id),
    );
    expect(res.status).toBe(200);
  });

  it('transitions estimating → proposal_sent', async () => {
    const currentLead = makeLead({ stage: 'estimating' });
    mockClerkAuth(mockAuth);
    mockCreateUserClient.mockResolvedValue(
      mockSupabaseClient({
        tables: { leads: { data: currentLead, error: null } },
      }),
    );

    const res = await STAGE_POST(
      makeJsonRequest('/api/crm/leads/123/stage', {
        stage: 'proposal_sent',
      }),
      makeContext(currentLead.id),
    );
    expect(res.status).toBe(200);
  });

  it('transitions proposal_sent → won', async () => {
    const currentLead = makeLead({ stage: 'proposal_sent' });
    mockClerkAuth(mockAuth);
    mockCreateUserClient.mockResolvedValue(
      mockSupabaseClient({
        tables: { leads: { data: currentLead, error: null } },
      }),
    );

    const res = await STAGE_POST(
      makeJsonRequest('/api/crm/leads/123/stage', { stage: 'won' }),
      makeContext(currentLead.id),
    );
    expect(res.status).toBe(200);
  });

  it('transitions any → lost (with lost_reason)', async () => {
    const currentLead = makeLead({ stage: 'new' });
    mockClerkAuth(mockAuth);
    mockCreateUserClient.mockResolvedValue(
      mockSupabaseClient({
        tables: { leads: { data: currentLead, error: null } },
      }),
    );

    const res = await STAGE_POST(
      makeJsonRequest('/api/crm/leads/123/stage', {
        stage: 'lost',
        lost_reason: 'Budget constraints',
      }),
      makeContext(currentLead.id),
    );
    expect(res.status).toBe(200);
  });

  it('rejects new → won (skip stages)', async () => {
    const currentLead = makeLead({ stage: 'new' });
    mockClerkAuth(mockAuth);
    mockCreateUserClient.mockResolvedValue(
      mockSupabaseClient({
        tables: { leads: { data: currentLead, error: null } },
      }),
    );

    const res = await STAGE_POST(
      makeJsonRequest('/api/crm/leads/123/stage', { stage: 'won' }),
      makeContext(currentLead.id),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('not allowed');
  });

  it('rejects lost → qualified (dead end)', async () => {
    const currentLead = makeLead({ stage: 'lost' });
    mockClerkAuth(mockAuth);
    mockCreateUserClient.mockResolvedValue(
      mockSupabaseClient({
        tables: { leads: { data: currentLead, error: null } },
      }),
    );

    const res = await STAGE_POST(
      makeJsonRequest('/api/crm/leads/123/stage', { stage: 'qualified' }),
      makeContext(currentLead.id),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('terminal');
  });

  it('rejects lost without lost_reason', async () => {
    const currentLead = makeLead({ stage: 'new' });
    mockClerkAuth(mockAuth);
    mockCreateUserClient.mockResolvedValue(
      mockSupabaseClient({
        tables: { leads: { data: currentLead, error: null } },
      }),
    );

    const res = await STAGE_POST(
      makeJsonRequest('/api/crm/leads/123/stage', { stage: 'lost' }),
      makeContext(currentLead.id),
    );
    expect(res.status).toBe(400);
  });

  it('rejects invalid stage enum value', async () => {
    mockClerkAuth(mockAuth);
    // No need to mock Supabase — Zod validation should fail before DB call
    const res = await STAGE_POST(
      makeJsonRequest('/api/crm/leads/123/stage', { stage: 'invalid_stage' }),
      makeContext('some-id'),
    );
    expect(res.status).toBe(400);
  });
});
