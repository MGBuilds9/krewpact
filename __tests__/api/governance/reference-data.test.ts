/**
 * Tests for /api/governance/reference-data (GET + POST),
 * /api/governance/reference-data/[setId] (GET + PATCH),
 * /api/governance/reference-data/[setId]/values (GET + POST).
 * Tables: reference_data_sets, reference_data_values
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
} from '@/__tests__/helpers';
import { GET as GET_DETAIL, PATCH } from '@/app/api/governance/reference-data/[setId]/route';
import {
  GET as GET_VALUES,
  POST as POST_VALUE,
} from '@/app/api/governance/reference-data/[setId]/values/route';
import { GET as GET_LIST, POST as POST_CREATE } from '@/app/api/governance/reference-data/route';
import { createUserClientSafe } from '@/lib/supabase/server';

const mockAuth = vi.mocked(auth);
const mockCreateUserClientSafe = vi.mocked(createUserClientSafe);
const SET_ID = '00000000-0000-4000-a000-000000000701';

function setCtx(setId: string = SET_ID) {
  return { params: Promise.resolve({ setId }) };
}

const sampleSet = {
  id: SET_ID,
  set_key: 'project_status',
  set_name: 'Project Status',
  status: 'active',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const sampleValue = {
  id: '00000000-0000-4000-a000-000000000702',
  data_set_id: SET_ID,
  value_key: 'active',
  value_name: 'Active',
  sort_order: 1,
  is_active: true,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

/* --- LIST SETS --- */
describe('GET /api/governance/reference-data', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const res = await GET_LIST(makeRequest('/api/governance/reference-data'));
    expect(res.status).toBe(401);
  });

  it('returns reference data sets list', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { reference_data_sets: { data: [sampleSet], error: null, count: 1 } },
      }),
      error: null,
    });
    const res = await GET_LIST(makeRequest('/api/governance/reference-data'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].set_key).toBe('project_status');
  });

  it('returns 500 on DB error', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { reference_data_sets: { data: null, error: { message: 'err' }, count: null } },
      }),
      error: null,
    });
    const res = await GET_LIST(makeRequest('/api/governance/reference-data'));
    expect(res.status).toBe(500);
  });
});

/* --- CREATE SET --- */
describe('POST /api/governance/reference-data', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const res = await POST_CREATE(makeJsonRequest('/api/governance/reference-data', {}));
    expect(res.status).toBe(401);
  });

  it('returns 201 on valid creation', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { reference_data_sets: { data: sampleSet, error: null } },
      }),
      error: null,
    });
    const res = await POST_CREATE(
      makeJsonRequest('/api/governance/reference-data', {
        set_key: 'project_status',
        set_name: 'Project Status',
      }),
    );
    expect(res.status).toBe(201);
  });

  it('returns 500 on DB error', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { reference_data_sets: { data: null, error: { message: 'insert err' } } },
      }),
      error: null,
    });
    const res = await POST_CREATE(
      makeJsonRequest('/api/governance/reference-data', {
        set_key: 'project_status',
        set_name: 'Project Status',
      }),
    );
    expect(res.status).toBe(500);
  });
});

/* --- DETAIL GET --- */
describe('GET /api/governance/reference-data/[setId]', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const res = await GET_DETAIL(makeRequest('/api/governance/reference-data/x'), setCtx());
    expect(res.status).toBe(401);
  });

  it('returns reference data set on success', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { reference_data_sets: { data: sampleSet, error: null } },
      }),
      error: null,
    });
    const res = await GET_DETAIL(makeRequest('/api/governance/reference-data/x'), setCtx());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.set_key).toBe('project_status');
  });

  it('returns 404 on not found', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { reference_data_sets: { data: null, error: { message: 'not found' } } },
      }),
      error: null,
    });
    const res = await GET_DETAIL(makeRequest('/api/governance/reference-data/x'), setCtx());
    expect(res.status).toBe(404);
  });
});

/* --- DETAIL PATCH --- */
describe('PATCH /api/governance/reference-data/[setId]', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const res = await PATCH(
      makeJsonRequest('/api/governance/reference-data/x', { set_name: 'Updated' }, 'PATCH'),
      setCtx(),
    );
    expect(res.status).toBe(401);
  });

  it('returns updated set on success', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: {
          reference_data_sets: { data: { ...sampleSet, set_name: 'Updated' }, error: null },
        },
      }),
      error: null,
    });
    const res = await PATCH(
      makeJsonRequest('/api/governance/reference-data/x', { set_name: 'Updated' }, 'PATCH'),
      setCtx(),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.set_name).toBe('Updated');
  });

  it('returns 500 on DB error', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { reference_data_sets: { data: null, error: { message: 'err' } } },
      }),
      error: null,
    });
    const res = await PATCH(
      makeJsonRequest('/api/governance/reference-data/x', { set_name: 'Updated' }, 'PATCH'),
      setCtx(),
    );
    expect(res.status).toBe(500);
  });
});

/* --- VALUES GET --- */
describe('GET /api/governance/reference-data/[setId]/values', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const res = await GET_VALUES(makeRequest('/api/governance/reference-data/x/values'), setCtx());
    expect(res.status).toBe(401);
  });

  it('returns values list', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { reference_data_values: { data: [sampleValue], error: null, count: 1 } },
      }),
      error: null,
    });
    const res = await GET_VALUES(makeRequest('/api/governance/reference-data/x/values'), setCtx());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].value_key).toBe('active');
  });

  it('returns 500 on DB error', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { reference_data_values: { data: null, error: { message: 'err' }, count: null } },
      }),
      error: null,
    });
    const res = await GET_VALUES(makeRequest('/api/governance/reference-data/x/values'), setCtx());
    expect(res.status).toBe(500);
  });
});

/* --- VALUES POST --- */
describe('POST /api/governance/reference-data/[setId]/values', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const res = await POST_VALUE(
      makeJsonRequest('/api/governance/reference-data/x/values', {}),
      setCtx(),
    );
    expect(res.status).toBe(401);
  });

  it('returns 201 on valid value creation', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { reference_data_values: { data: sampleValue, error: null } },
      }),
      error: null,
    });
    const res = await POST_VALUE(
      makeJsonRequest('/api/governance/reference-data/x/values', {
        value_key: 'active',
        value_name: 'Active',
        sort_order: 1,
      }),
      setCtx(),
    );
    expect(res.status).toBe(201);
  });

  it('returns 500 on DB error', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { reference_data_values: { data: null, error: { message: 'insert err' } } },
      }),
      error: null,
    });
    const res = await POST_VALUE(
      makeJsonRequest('/api/governance/reference-data/x/values', {
        value_key: 'active',
        value_name: 'Active',
        sort_order: 1,
      }),
      setCtx(),
    );
    expect(res.status).toBe(500);
  });
});
