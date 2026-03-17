/**
 * Tests for /api/cost-codes (GET + POST),
 * /api/cost-codes/[id] (GET + PATCH),
 * /api/cost-codes/[id]/mappings (GET + POST).
 * Tables: cost_code_dictionary, cost_code_mappings
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@clerk/nextjs/server', () => ({ auth: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createUserClientSafe: vi.fn() }));
vi.mock('@/lib/api/rate-limit', () => ({
  rateLimit: vi.fn().mockResolvedValue({ success: true }),
  rateLimitResponse: vi.fn(),
}));

import { auth } from '@clerk/nextjs/server';

import {
  makeJsonRequest,
  makeRequest,
  mockClerkAuth,
  mockClerkUnauth,
  mockSupabaseClient,
  TEST_IDS,
} from '@/__tests__/helpers';
import {
  GET as GET_MAPPINGS,
  POST as POST_MAPPING,
} from '@/app/api/cost-codes/[id]/mappings/route';
import { GET as GET_DETAIL, PATCH } from '@/app/api/cost-codes/[id]/route';
import { GET as GET_LIST, POST as POST_CREATE } from '@/app/api/cost-codes/route';
import { createUserClientSafe } from '@/lib/supabase/server';

const mockAuth = vi.mocked(auth);
const mockCreateUserClientSafe = vi.mocked(createUserClientSafe);
const CODE_ID = '00000000-0000-4000-a000-000000000701';

function detailCtx(id: string = CODE_ID) {
  return { params: Promise.resolve({ id }) };
}

const sampleCode = {
  id: CODE_ID,
  division_id: TEST_IDS.DIVISION_ID,
  cost_code: '01-100',
  cost_code_name: 'General Conditions',
  parent_cost_code_id: null,
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const sampleMapping = {
  id: '00000000-0000-4000-a000-000000000702',
  division_id: TEST_IDS.DIVISION_ID,
  local_cost_code: '01-100',
  erp_cost_code: 'ERP-01-100',
  adp_labor_code: 'ADP-100',
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

/* --- LIST --- */
describe('GET /api/cost-codes', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const res = await GET_LIST(makeRequest('/api/cost-codes'));
    expect(res.status).toBe(401);
  });

  it('returns cost codes list', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { cost_code_dictionary: { data: [sampleCode], error: null, count: 1 } },
      }),
      error: null,
    });
    const res = await GET_LIST(makeRequest('/api/cost-codes'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].cost_code).toBe('01-100');
  });

  it('returns 500 on DB error', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { cost_code_dictionary: { data: null, error: { message: 'err' }, count: null } },
      }),
      error: null,
    });
    const res = await GET_LIST(makeRequest('/api/cost-codes'));
    expect(res.status).toBe(500);
  });
});

describe('POST /api/cost-codes', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const res = await POST_CREATE(makeJsonRequest('/api/cost-codes', {}));
    expect(res.status).toBe(401);
  });

  it('returns 400 on invalid body', async () => {
    mockClerkAuth(mockAuth);
    const res = await POST_CREATE(makeJsonRequest('/api/cost-codes', { bad: true }));
    expect(res.status).toBe(400);
  });

  it('returns 201 on valid creation', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { cost_code_dictionary: { data: sampleCode, error: null } },
      }),
      error: null,
    });
    const res = await POST_CREATE(
      makeJsonRequest('/api/cost-codes', {
        division_id: TEST_IDS.DIVISION_ID,
        cost_code: '01-100',
        cost_code_name: 'General Conditions',
      }),
    );
    expect(res.status).toBe(201);
  });
});

/* --- DETAIL --- */
describe('GET /api/cost-codes/[id]', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const res = await GET_DETAIL(makeRequest('/api/cost-codes/x'), detailCtx());
    expect(res.status).toBe(401);
  });

  it('returns cost code on success', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { cost_code_dictionary: { data: sampleCode, error: null } },
      }),
      error: null,
    });
    const res = await GET_DETAIL(makeRequest('/api/cost-codes/x'), detailCtx());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.cost_code_name).toBe('General Conditions');
  });

  it('returns 404 on not found', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { cost_code_dictionary: { data: null, error: { message: 'not found' } } },
      }),
      error: null,
    });
    const res = await GET_DETAIL(makeRequest('/api/cost-codes/x'), detailCtx());
    expect(res.status).toBe(404);
  });
});

describe('PATCH /api/cost-codes/[id]', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const res = await PATCH(
      makeJsonRequest('/api/cost-codes/x', { cost_code_name: 'Updated' }, 'PATCH'),
      detailCtx(),
    );
    expect(res.status).toBe(401);
  });

  it('returns updated cost code on success', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: {
          cost_code_dictionary: { data: { ...sampleCode, cost_code_name: 'Updated' }, error: null },
        },
      }),
      error: null,
    });
    const res = await PATCH(
      makeJsonRequest('/api/cost-codes/x', { cost_code_name: 'Updated' }, 'PATCH'),
      detailCtx(),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.cost_code_name).toBe('Updated');
  });
});

/* --- MAPPINGS --- */
describe('GET /api/cost-codes/[id]/mappings', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const res = await GET_MAPPINGS(makeRequest('/api/cost-codes/x/mappings'), detailCtx());
    expect(res.status).toBe(401);
  });

  it('returns mappings list', async () => {
    mockClerkAuth(mockAuth);
    const client = mockSupabaseClient({
      tables: {
        cost_code_dictionary: {
          data: { cost_code: '01-100', division_id: TEST_IDS.DIVISION_ID },
          error: null,
        },
        cost_code_mappings: { data: [sampleMapping], error: null, count: 1 },
      },
    });
    mockCreateUserClientSafe.mockResolvedValue({ client: client, error: null });
    const res = await GET_MAPPINGS(makeRequest('/api/cost-codes/x/mappings'), detailCtx());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
  });
});

describe('POST /api/cost-codes/[id]/mappings', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const res = await POST_MAPPING(makeJsonRequest('/api/cost-codes/x/mappings', {}), detailCtx());
    expect(res.status).toBe(401);
  });

  it('returns 400 on invalid body', async () => {
    mockClerkAuth(mockAuth);
    const res = await POST_MAPPING(
      makeJsonRequest('/api/cost-codes/x/mappings', { bad: true }),
      detailCtx(),
    );
    expect(res.status).toBe(400);
  });

  it('returns 201 on valid creation', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { cost_code_mappings: { data: sampleMapping, error: null } },
      }),
      error: null,
    });
    const res = await POST_MAPPING(
      makeJsonRequest('/api/cost-codes/x/mappings', {
        division_id: TEST_IDS.DIVISION_ID,
        local_cost_code: '01-100',
        erp_cost_code: 'ERP-01-100',
      }),
      detailCtx(),
    );
    expect(res.status).toBe(201);
  });
});
