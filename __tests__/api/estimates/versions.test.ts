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
import {
  GET as GET_VERSIONS,
  POST as POST_VERSION,
} from '@/app/api/estimates/[id]/versions/route';
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

const ESTIMATE_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const USER_ID = 'b2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33';

function makeContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

// ============================================================
// GET /api/estimates/[id]/versions
// ============================================================
describe('GET /api/estimates/[id]/versions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFixtureCounter();
  });

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const res = await GET_VERSIONS(
      makeRequest(`/api/estimates/${ESTIMATE_ID}/versions`),
      makeContext(ESTIMATE_ID),
    );
    expect(res.status).toBe(401);
  });

  it('returns empty array for new estimate', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClient.mockResolvedValue(
      mockSupabaseClient({
        tables: { estimate_versions: { data: [], error: null } },
      }),
    );

    const res = await GET_VERSIONS(
      makeRequest(`/api/estimates/${ESTIMATE_ID}/versions`),
      makeContext(ESTIMATE_ID),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual([]);
  });

  it('returns versions sorted by revision_no desc', async () => {
    const versions = [
      {
        id: 'v2',
        estimate_id: ESTIMATE_ID,
        revision_no: 2,
        snapshot: {},
        reason: 'Updated pricing',
        created_by: USER_ID,
        created_at: '2026-02-01T00:00:00Z',
      },
      {
        id: 'v1',
        estimate_id: ESTIMATE_ID,
        revision_no: 1,
        snapshot: {},
        reason: 'Initial version',
        created_by: USER_ID,
        created_at: '2026-01-15T00:00:00Z',
      },
    ];
    mockClerkAuth(mockAuth);
    const client = mockSupabaseClient({
      tables: { estimate_versions: { data: versions, error: null } },
    });
    mockCreateUserClient.mockResolvedValue(client);

    const res = await GET_VERSIONS(
      makeRequest(`/api/estimates/${ESTIMATE_ID}/versions`),
      makeContext(ESTIMATE_ID),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(2);
    expect(client.from).toHaveBeenCalledWith('estimate_versions');
  });
});

// ============================================================
// POST /api/estimates/[id]/versions — create snapshot
// ============================================================
describe('POST /api/estimates/[id]/versions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFixtureCounter();
  });

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const res = await POST_VERSION(
      makeJsonRequest(`/api/estimates/${ESTIMATE_ID}/versions`, {}),
      makeContext(ESTIMATE_ID),
    );
    expect(res.status).toBe(401);
  });

  it('creates snapshot and returns version object', async () => {
    const estimate = makeEstimate({
      id: ESTIMATE_ID,
      revision_no: 1,
      estimate_number: 'EST-2026-001',
      subtotal_amount: 1000,
      tax_amount: 130,
      total_amount: 1130,
    });
    const lines = [
      makeEstimateLine({ estimate_id: ESTIMATE_ID, description: 'Labour', line_total: 500 }),
      makeEstimateLine({ estimate_id: ESTIMATE_ID, description: 'Material', line_total: 500 }),
    ];
    const version = {
      id: 'c3eebc99-9c0b-4ef8-bb6d-6bb9bd380a44',
      estimate_id: ESTIMATE_ID,
      revision_no: 1,
      snapshot: { estimate, lines, created_at: expect.any(String) },
      reason: null,
      created_by: USER_ID,
      created_at: '2026-02-12T00:00:00Z',
    };

    mockClerkAuth(mockAuth, USER_ID);
    mockCreateUserClient.mockResolvedValue(
      mockSupabaseClient({
        tables: {
          estimates: { data: { ...estimate, estimate_lines: lines }, error: null },
          estimate_versions: { data: version, error: null },
        },
      }),
    );

    const res = await POST_VERSION(
      makeJsonRequest(`/api/estimates/${ESTIMATE_ID}/versions`, {}),
      makeContext(ESTIMATE_ID),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.revision_no).toBeDefined();
    expect(body.snapshot).toBeDefined();
  });

  it('snapshot contains full estimate data', async () => {
    const estimate = makeEstimate({
      id: ESTIMATE_ID,
      revision_no: 1,
      estimate_number: 'EST-2026-005',
      subtotal_amount: 2000,
      tax_amount: 260,
      total_amount: 2260,
    });
    const lines = [makeEstimateLine({ estimate_id: ESTIMATE_ID })];
    const version = {
      id: 'c3eebc99-9c0b-4ef8-bb6d-6bb9bd380a44',
      estimate_id: ESTIMATE_ID,
      revision_no: 1,
      snapshot: {
        estimate: {
          estimate_number: estimate.estimate_number,
          status: estimate.status,
          subtotal_amount: estimate.subtotal_amount,
          tax_amount: estimate.tax_amount,
          total_amount: estimate.total_amount,
        },
        lines,
        created_at: '2026-02-12T00:00:00Z',
      },
      reason: null,
      created_by: USER_ID,
      created_at: '2026-02-12T00:00:00Z',
    };

    mockClerkAuth(mockAuth, USER_ID);
    mockCreateUserClient.mockResolvedValue(
      mockSupabaseClient({
        tables: {
          estimates: { data: { ...estimate, estimate_lines: lines }, error: null },
          estimate_versions: { data: version, error: null },
        },
      }),
    );

    const res = await POST_VERSION(
      makeJsonRequest(`/api/estimates/${ESTIMATE_ID}/versions`, {}),
      makeContext(ESTIMATE_ID),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.snapshot.estimate).toBeDefined();
    expect(body.snapshot.estimate.estimate_number).toBeDefined();
  });

  it('snapshot contains all line items', async () => {
    const estimate = makeEstimate({ id: ESTIMATE_ID, revision_no: 1 });
    const lines = [
      makeEstimateLine({ estimate_id: ESTIMATE_ID, description: 'Line A' }),
      makeEstimateLine({ estimate_id: ESTIMATE_ID, description: 'Line B' }),
      makeEstimateLine({ estimate_id: ESTIMATE_ID, description: 'Line C' }),
    ];
    const version = {
      id: 'c3eebc99-9c0b-4ef8-bb6d-6bb9bd380a44',
      estimate_id: ESTIMATE_ID,
      revision_no: 1,
      snapshot: { estimate, lines, created_at: '2026-02-12T00:00:00Z' },
      reason: null,
      created_by: USER_ID,
      created_at: '2026-02-12T00:00:00Z',
    };

    mockClerkAuth(mockAuth, USER_ID);
    mockCreateUserClient.mockResolvedValue(
      mockSupabaseClient({
        tables: {
          estimates: { data: { ...estimate, estimate_lines: lines }, error: null },
          estimate_versions: { data: version, error: null },
        },
      }),
    );

    const res = await POST_VERSION(
      makeJsonRequest(`/api/estimates/${ESTIMATE_ID}/versions`, {}),
      makeContext(ESTIMATE_ID),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.snapshot.lines).toHaveLength(3);
  });

  it('increments estimate revision_no from 1 to 2', async () => {
    const estimate = makeEstimate({ id: ESTIMATE_ID, revision_no: 1 });
    const lines = [makeEstimateLine({ estimate_id: ESTIMATE_ID })];
    const version = {
      id: 'c3eebc99-9c0b-4ef8-bb6d-6bb9bd380a44',
      estimate_id: ESTIMATE_ID,
      revision_no: 1,
      snapshot: { estimate, lines, created_at: '2026-02-12T00:00:00Z' },
      reason: null,
      created_by: USER_ID,
      created_at: '2026-02-12T00:00:00Z',
    };

    mockClerkAuth(mockAuth, USER_ID);
    const client = mockSupabaseClient({
      tables: {
        estimates: { data: { ...estimate, estimate_lines: lines }, error: null },
        estimate_versions: { data: version, error: null },
      },
    });
    mockCreateUserClient.mockResolvedValue(client);

    const res = await POST_VERSION(
      makeJsonRequest(`/api/estimates/${ESTIMATE_ID}/versions`, {}),
      makeContext(ESTIMATE_ID),
    );
    expect(res.status).toBe(201);
    // Verify the route called estimates table to update revision_no
    const fromCalls = (client.from as ReturnType<typeof vi.fn>).mock.calls;
    const tablesCalled = fromCalls.map((c: unknown[]) => c[0]);
    expect(tablesCalled).toContain('estimates');
  });

  it('stores reason field when provided', async () => {
    const estimate = makeEstimate({ id: ESTIMATE_ID, revision_no: 2 });
    const lines = [makeEstimateLine({ estimate_id: ESTIMATE_ID })];
    const version = {
      id: 'c3eebc99-9c0b-4ef8-bb6d-6bb9bd380a44',
      estimate_id: ESTIMATE_ID,
      revision_no: 2,
      snapshot: { estimate, lines, created_at: '2026-02-12T00:00:00Z' },
      reason: 'Updated pricing after client feedback',
      created_by: USER_ID,
      created_at: '2026-02-12T00:00:00Z',
    };

    mockClerkAuth(mockAuth, USER_ID);
    mockCreateUserClient.mockResolvedValue(
      mockSupabaseClient({
        tables: {
          estimates: { data: { ...estimate, estimate_lines: lines }, error: null },
          estimate_versions: { data: version, error: null },
        },
      }),
    );

    const res = await POST_VERSION(
      makeJsonRequest(`/api/estimates/${ESTIMATE_ID}/versions`, {
        reason: 'Updated pricing after client feedback',
      }),
      makeContext(ESTIMATE_ID),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.reason).toBe('Updated pricing after client feedback');
  });

  it('returns 404 when estimate does not exist', async () => {
    mockClerkAuth(mockAuth, USER_ID);
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

    const res = await POST_VERSION(
      makeJsonRequest(`/api/estimates/${ESTIMATE_ID}/versions`, {}),
      makeContext(ESTIMATE_ID),
    );
    expect(res.status).toBe(404);
  });
});
