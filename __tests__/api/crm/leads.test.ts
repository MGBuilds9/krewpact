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
  makeLead,
  makeRequest,
  mockClerkAuth,
  mockClerkUnauth,
  mockSupabaseClient,
  resetFixtureCounter,
} from '@/__tests__/helpers';
import { DELETE, GET as GET_ID, PATCH } from '@/app/api/crm/leads/[id]/route';
import { POST as STAGE_POST } from '@/app/api/crm/leads/[id]/stage/route';
import { GET, POST } from '@/app/api/crm/leads/route';
import { createUserClientSafe } from '@/lib/supabase/server';

const mockAuth = vi.mocked(auth);
const mockCreateUserClientSafe = vi.mocked(createUserClientSafe);

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
    expect(body.error.code).toBe('UNAUTHORIZED');
    expect(body.error.message).toBe('Authentication required');
  });

  it('returns leads list', async () => {
    const leads = [makeLead(), makeLead({ company_name: 'Second Lead' })];
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({ tables: { leads: { data: leads, error: null } } }),
      error: null,
    });

    const res = await GET(makeRequest('/api/crm/leads'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toEqual(leads);
    expect(typeof body.total).toBe('number');
    expect(typeof body.hasMore).toBe('boolean');
  });

  it('filters by division_id', async () => {
    const leads = [makeLead()];
    mockClerkAuth(mockAuth);
    const client = mockSupabaseClient({
      tables: { leads: { data: leads, error: null } },
    });
    mockCreateUserClientSafe.mockResolvedValue({ client: client, error: null });

    const res = await GET(
      makeRequest('/api/crm/leads?division_id=a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'),
    );
    expect(res.status).toBe(200);
    expect(client.from).toHaveBeenCalledWith('leads');
  });

  it('filters by status', async () => {
    const leads = [makeLead({ status: 'qualified' })];
    mockClerkAuth(mockAuth);
    const client = mockSupabaseClient({
      tables: { leads: { data: leads, error: null } },
    });
    mockCreateUserClientSafe.mockResolvedValue({ client: client, error: null });

    const res = await GET(makeRequest('/api/crm/leads?status=qualified'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toEqual(leads);
    expect(typeof body.total).toBe('number');
    expect(typeof body.hasMore).toBe('boolean');
  });

  it('filters by assigned_to', async () => {
    const leads = [makeLead()];
    mockClerkAuth(mockAuth);
    const client = mockSupabaseClient({
      tables: { leads: { data: leads, error: null } },
    });
    mockCreateUserClientSafe.mockResolvedValue({ client: client, error: null });

    const res = await GET(
      makeRequest('/api/crm/leads?assigned_to=a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'),
    );
    expect(res.status).toBe(200);
    expect(client.from).toHaveBeenCalledWith('leads');
  });

  it('filters by search', async () => {
    const leads = [makeLead({ company_name: 'Big Construction' })];
    mockClerkAuth(mockAuth);
    const client = mockSupabaseClient({
      tables: { leads: { data: leads, error: null } },
    });
    mockCreateUserClientSafe.mockResolvedValue({ client: client, error: null });

    const res = await GET(makeRequest('/api/crm/leads?search=Construction'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toEqual(leads);
    expect(typeof body.total).toBe('number');
    expect(typeof body.hasMore).toBe('boolean');
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
    const res = await POST(makeJsonRequest('/api/crm/leads', { company_name: 'Test Lead' }));
    expect(res.status).toBe(401);
  });

  it('creates lead with default status new', async () => {
    const created = makeLead({ status: 'new' });
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({ tables: { leads: { data: created, error: null } } }),
      error: null,
    });

    const res = await POST(makeJsonRequest('/api/crm/leads', { company_name: 'Test Lead' }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.status).toBe('new');
  });

  it('creates lead with all optional fields', async () => {
    const created = makeLead({
      company_name: 'Corp',
      source_channel: 'referral',
      industry: 'Construction',
    });
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({ tables: { leads: { data: created, error: null } } }),
      error: null,
    });

    const res = await POST(
      makeJsonRequest('/api/crm/leads', {
        company_name: 'Corp',
        division_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        source_channel: 'referral',
        industry: 'Construction',
        city: 'Toronto',
        province: 'ON',
        notes: 'Key prospect',
        assigned_to: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      }),
    );
    expect(res.status).toBe(201);
  });

  it('returns 400 for invalid data (missing company_name)', async () => {
    mockClerkAuth(mockAuth);
    const res = await POST(makeJsonRequest('/api/crm/leads', { source_channel: 'website' }));
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
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({ tables: { leads: { data: lead, error: null } } }),
      error: null,
    });

    const res = await GET_ID(makeRequest('/api/crm/leads/123'), makeContext(lead.id));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.company_name).toBe('Big Construction Project');
  });

  it('returns 404 for non-existent lead', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: {
          leads: {
            data: null,
            error: { message: 'Row not found', code: 'PGRST116' },
          },
        },
      }),
      error: null,
    });

    const res = await GET_ID(makeRequest('/api/crm/leads/nonexistent'), makeContext('nonexistent'));
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
    const updated = makeLead({ company_name: 'Updated Lead' });
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({ tables: { leads: { data: updated, error: null } } }),
      error: null,
    });

    const res = await PATCH(
      makeJsonRequest('/api/crm/leads/123', { company_name: 'Updated Lead' }, 'PATCH'),
      makeContext(updated.id),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.company_name).toBe('Updated Lead');
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
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({ tables: { leads: { data: null, error: null } } }),
      error: null,
    });

    const res = await DELETE(makeRequest('/api/crm/leads/123'), makeContext('some-id'));
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

  it('transitions new → contacted', async () => {
    const currentLead = makeLead({ status: 'new' });
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { leads: { data: currentLead, error: null } },
      }),
      error: null,
    });

    const res = await STAGE_POST(
      makeJsonRequest('/api/crm/leads/123/stage', { status: 'contacted' }),
      makeContext(currentLead.id),
    );
    expect(res.status).toBe(200);
  });

  it('transitions contacted → qualified', async () => {
    const currentLead = makeLead({ status: 'contacted' });
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { leads: { data: currentLead, error: null } },
      }),
      error: null,
    });

    const res = await STAGE_POST(
      makeJsonRequest('/api/crm/leads/123/stage', { status: 'qualified' }),
      makeContext(currentLead.id),
    );
    expect(res.status).toBe(200);
  });

  it('transitions qualified → proposal', async () => {
    const currentLead = makeLead({ status: 'qualified' });
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { leads: { data: currentLead, error: null } },
      }),
      error: null,
    });

    const res = await STAGE_POST(
      makeJsonRequest('/api/crm/leads/123/stage', { status: 'proposal' }),
      makeContext(currentLead.id),
    );
    expect(res.status).toBe(200);
  });

  it('transitions negotiation → won', async () => {
    const currentLead = makeLead({ status: 'negotiation' });
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { leads: { data: currentLead, error: null } },
      }),
      error: null,
    });

    const res = await STAGE_POST(
      makeJsonRequest('/api/crm/leads/123/stage', { status: 'won' }),
      makeContext(currentLead.id),
    );
    expect(res.status).toBe(200);
  });

  it('transitions any → lost (with lost_reason)', async () => {
    const currentLead = makeLead({ status: 'new' });
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { leads: { data: currentLead, error: null } },
      }),
      error: null,
    });

    const res = await STAGE_POST(
      makeJsonRequest('/api/crm/leads/123/stage', {
        status: 'lost',
        lost_reason: 'Budget constraints',
      }),
      makeContext(currentLead.id),
    );
    expect(res.status).toBe(200);
  });

  it('rejects new → won (skip stages)', async () => {
    const currentLead = makeLead({ status: 'new' });
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { leads: { data: currentLead, error: null } },
      }),
      error: null,
    });

    const res = await STAGE_POST(
      makeJsonRequest('/api/crm/leads/123/stage', { status: 'won' }),
      makeContext(currentLead.id),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('not allowed');
  });

  it('rejects lost → qualified (dead end)', async () => {
    const currentLead = makeLead({ status: 'lost' });
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { leads: { data: currentLead, error: null } },
      }),
      error: null,
    });

    const res = await STAGE_POST(
      makeJsonRequest('/api/crm/leads/123/stage', { status: 'qualified' }),
      makeContext(currentLead.id),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('terminal');
  });

  it('rejects lost without lost_reason', async () => {
    const currentLead = makeLead({ status: 'new' });
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { leads: { data: currentLead, error: null } },
      }),
      error: null,
    });

    const res = await STAGE_POST(
      makeJsonRequest('/api/crm/leads/123/stage', { status: 'lost' }),
      makeContext(currentLead.id),
    );
    expect(res.status).toBe(400);
  });

  it('rejects invalid stage enum value', async () => {
    mockClerkAuth(mockAuth);
    // No need to mock Supabase — Zod validation should fail before DB call
    const res = await STAGE_POST(
      makeJsonRequest('/api/crm/leads/123/stage', { status: 'invalid_stage' }),
      makeContext('some-id'),
    );
    expect(res.status).toBe(400);
  });
});
