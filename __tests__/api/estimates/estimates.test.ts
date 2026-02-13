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
import { GET, POST } from '@/app/api/estimates/route';
import {
  GET as GET_ID,
  PATCH,
  DELETE,
} from '@/app/api/estimates/[id]/route';
import {
  mockSupabaseClient,
  mockClerkAuth,
  mockClerkUnauth,
  makeRequest,
  makeJsonRequest,
  makeEstimate,
  makeEstimateLine,
  resetFixtureCounter,
} from '@/__tests__/helpers';

const mockAuth = vi.mocked(auth);
const mockCreateUserClient = vi.mocked(createUserClient);

function makeContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

// ============================================================
// GET /api/estimates
// ============================================================
describe('GET /api/estimates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFixtureCounter();
  });

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const res = await GET(makeRequest('/api/estimates'));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns estimates list', async () => {
    const estimates = [makeEstimate(), makeEstimate({ estimate_number: 'EST-2026-002' })];
    mockClerkAuth(mockAuth);
    mockCreateUserClient.mockResolvedValue(
      mockSupabaseClient({ tables: { estimates: { data: estimates, error: null } } }),
    );

    const res = await GET(makeRequest('/api/estimates'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual(estimates);
  });

  it('filters by division_id', async () => {
    const estimates = [makeEstimate()];
    mockClerkAuth(mockAuth);
    const client = mockSupabaseClient({
      tables: { estimates: { data: estimates, error: null } },
    });
    mockCreateUserClient.mockResolvedValue(client);

    const res = await GET(
      makeRequest('/api/estimates?division_id=a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'),
    );
    expect(res.status).toBe(200);
    expect(client.from).toHaveBeenCalledWith('estimates');
  });

  it('filters by status', async () => {
    const estimates = [makeEstimate({ status: 'review' })];
    mockClerkAuth(mockAuth);
    const client = mockSupabaseClient({
      tables: { estimates: { data: estimates, error: null } },
    });
    mockCreateUserClient.mockResolvedValue(client);

    const res = await GET(makeRequest('/api/estimates?status=review'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual(estimates);
  });

  it('filters by opportunity_id', async () => {
    const estimates = [makeEstimate()];
    mockClerkAuth(mockAuth);
    const client = mockSupabaseClient({
      tables: { estimates: { data: estimates, error: null } },
    });
    mockCreateUserClient.mockResolvedValue(client);

    const res = await GET(
      makeRequest('/api/estimates?opportunity_id=a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'),
    );
    expect(res.status).toBe(200);
    expect(client.from).toHaveBeenCalledWith('estimates');
  });
});

// ============================================================
// POST /api/estimates
// ============================================================
describe('POST /api/estimates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFixtureCounter();
  });

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const res = await POST(
      makeJsonRequest('/api/estimates', {
        division_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      }),
    );
    expect(res.status).toBe(401);
  });

  it('creates estimate with auto-generated estimate_number', async () => {
    const created = makeEstimate({ estimate_number: 'EST-2026-001' });
    mockClerkAuth(mockAuth);
    // First call: count existing estimates; second call: insert
    mockCreateUserClient.mockResolvedValue(
      mockSupabaseClient({
        tables: {
          estimates: { data: created, error: null },
        },
        defaultResponse: { data: { count: 0 }, error: null },
      }),
    );

    const res = await POST(
      makeJsonRequest('/api/estimates', {
        division_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      }),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.estimate_number).toMatch(/^EST-\d{4}-\d{3}$/);
  });

  it('sets default status to draft', async () => {
    const created = makeEstimate({ status: 'draft' });
    mockClerkAuth(mockAuth);
    mockCreateUserClient.mockResolvedValue(
      mockSupabaseClient({
        tables: { estimates: { data: created, error: null } },
      }),
    );

    const res = await POST(
      makeJsonRequest('/api/estimates', {
        division_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      }),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.status).toBe('draft');
  });

  it('returns 400 for invalid division_id', async () => {
    mockClerkAuth(mockAuth);
    const res = await POST(
      makeJsonRequest('/api/estimates', { division_id: 'not-a-uuid' }),
    );
    expect(res.status).toBe(400);
  });
});

// ============================================================
// GET /api/estimates/[id]
// ============================================================
describe('GET /api/estimates/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFixtureCounter();
  });

  it('returns estimate with nested lines array', async () => {
    const lines = [makeEstimateLine(), makeEstimateLine({ description: 'Material — Lumber' })];
    const estimate = makeEstimate({ estimate_lines: lines });
    mockClerkAuth(mockAuth);
    mockCreateUserClient.mockResolvedValue(
      mockSupabaseClient({
        tables: { estimates: { data: estimate, error: null } },
      }),
    );

    const res = await GET_ID(
      makeRequest('/api/estimates/123'),
      makeContext(estimate.id),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.estimate_lines).toHaveLength(2);
  });

  it('returns 404 for non-existent estimate', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClient.mockResolvedValue(
      mockSupabaseClient({
        tables: {
          estimates: {
            data: null,
            error: { message: 'Row not found', code: 'PGRST116' },
          },
        },
      }),
    );

    const res = await GET_ID(
      makeRequest('/api/estimates/nonexistent'),
      makeContext('nonexistent'),
    );
    expect(res.status).toBe(404);
  });
});

// ============================================================
// PATCH /api/estimates/[id]
// ============================================================
describe('PATCH /api/estimates/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFixtureCounter();
  });

  it('updates estimate', async () => {
    const updated = makeEstimate({ currency_code: 'USD' });
    mockClerkAuth(mockAuth);
    mockCreateUserClient.mockResolvedValue(
      mockSupabaseClient({
        tables: { estimates: { data: updated, error: null } },
      }),
    );

    const res = await PATCH(
      makeJsonRequest('/api/estimates/123', { currency_code: 'USD' }, 'PATCH'),
      makeContext(updated.id),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.currency_code).toBe('USD');
  });

  it('status transition draft → review works', async () => {
    const current = makeEstimate({ status: 'draft' });
    mockClerkAuth(mockAuth);
    mockCreateUserClient.mockResolvedValue(
      mockSupabaseClient({
        tables: { estimates: { data: current, error: null } },
      }),
    );

    const res = await PATCH(
      makeJsonRequest('/api/estimates/123', { status: 'review' }, 'PATCH'),
      makeContext(current.id),
    );
    expect(res.status).toBe(200);
  });

  it('status transition review → sent works', async () => {
    const current = makeEstimate({ status: 'review' });
    mockClerkAuth(mockAuth);
    mockCreateUserClient.mockResolvedValue(
      mockSupabaseClient({
        tables: { estimates: { data: current, error: null } },
      }),
    );

    const res = await PATCH(
      makeJsonRequest('/api/estimates/123', { status: 'sent' }, 'PATCH'),
      makeContext(current.id),
    );
    expect(res.status).toBe(200);
  });

  it('rejects invalid transition draft → approved', async () => {
    const current = makeEstimate({ status: 'draft' });
    mockClerkAuth(mockAuth);
    mockCreateUserClient.mockResolvedValue(
      mockSupabaseClient({
        tables: { estimates: { data: current, error: null } },
      }),
    );

    const res = await PATCH(
      makeJsonRequest('/api/estimates/123', { status: 'approved' }, 'PATCH'),
      makeContext(current.id),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('not allowed');
  });
});

// ============================================================
// DELETE /api/estimates/[id]
// ============================================================
describe('DELETE /api/estimates/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFixtureCounter();
  });

  it('deletes estimate', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClient.mockResolvedValue(
      mockSupabaseClient({
        tables: { estimates: { data: null, error: null } },
      }),
    );

    const res = await DELETE(
      makeRequest('/api/estimates/123'),
      makeContext('some-id'),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it('cascades to lines (delete calls estimates table)', async () => {
    mockClerkAuth(mockAuth);
    const client = mockSupabaseClient({
      tables: { estimates: { data: null, error: null } },
    });
    mockCreateUserClient.mockResolvedValue(client);

    const res = await DELETE(
      makeRequest('/api/estimates/123'),
      makeContext('some-id'),
    );
    expect(res.status).toBe(200);
    // The DB cascade handles line/version deletion, route just deletes the estimate
    expect(client.from).toHaveBeenCalledWith('estimates');
  });
});
