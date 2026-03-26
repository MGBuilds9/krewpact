/**
 * Tests for /api/timesheet-batches (GET + POST),
 * /api/timesheet-batches/[batchId] (GET + DELETE),
 * /api/timesheet-batches/[batchId]/approve (POST).
 * Table: timesheet_batches
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@clerk/nextjs/server', () => ({ auth: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createUserClientSafe: vi.fn() }));
vi.mock('@/lib/api/rate-limit', () => ({
  rateLimit: vi.fn().mockResolvedValue({ success: true }),
  rateLimitResponse: vi.fn(),
}));

const mockRequireRole = vi.fn();
vi.mock('@/lib/api/org', () => ({
  requireRole: (...args: unknown[]) => mockRequireRole(...args),
  getOrgIdFromAuth: vi.fn().mockResolvedValue('mdm-group'),
}));

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

import {
  makeJsonRequest,
  makeRequest,
  mockClerkAuth,
  mockClerkUnauth,
  mockSupabaseClient,
  TEST_IDS,
} from '@/__tests__/helpers';
import { POST as POST_APPROVE } from '@/app/api/timesheet-batches/[batchId]/approve/route';
import { DELETE, GET as GET_DETAIL } from '@/app/api/timesheet-batches/[batchId]/route';
import { GET as GET_LIST, POST as POST_CREATE } from '@/app/api/timesheet-batches/route';
import { createUserClientSafe } from '@/lib/supabase/server';

const mockAuth = vi.mocked(auth);
const mockCreateUserClientSafe = vi.mocked(createUserClientSafe);
const BATCH_ID = '00000000-0000-4000-a000-000000000601';

function batchCtx(batchId: string = BATCH_ID) {
  return { params: Promise.resolve({ batchId }) };
}

const sampleBatch = {
  id: BATCH_ID,
  division_id: TEST_IDS.DIVISION_ID,
  period_start: '2026-03-01',
  period_end: '2026-03-15',
  status: 'draft',
  submitted_by: TEST_IDS.USER_ID,
  approved_by: null,
  exported_at: null,
  adp_export_reference: null,
  created_at: '2026-03-01T00:00:00Z',
  updated_at: '2026-03-01T00:00:00Z',
};

/* --- LIST --- */
describe('GET /api/timesheet-batches', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const res = await GET_LIST(makeRequest('/api/timesheet-batches'));
    expect(res.status).toBe(401);
  });

  it('returns paginated batches', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { timesheet_batches: { data: [sampleBatch], error: null, count: 1 } },
      }),
      error: null,
    });
    const res = await GET_LIST(makeRequest('/api/timesheet-batches'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
  });

  it('returns 500 on DB error', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { timesheet_batches: { data: null, error: { message: 'err' }, count: null } },
      }),
      error: null,
    });
    const res = await GET_LIST(makeRequest('/api/timesheet-batches'));
    expect(res.status).toBe(500);
  });
});

describe('POST /api/timesheet-batches', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const res = await POST_CREATE(makeJsonRequest('/api/timesheet-batches', {}));
    expect(res.status).toBe(401);
  });

  it('returns 400 on invalid body', async () => {
    mockClerkAuth(mockAuth);
    const res = await POST_CREATE(makeJsonRequest('/api/timesheet-batches', { bad: true }));
    expect(res.status).toBe(400);
  });

  it('returns 201 on valid creation', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { timesheet_batches: { data: sampleBatch, error: null } },
      }),
      error: null,
    });
    const res = await POST_CREATE(
      makeJsonRequest('/api/timesheet-batches', {
        division_id: TEST_IDS.DIVISION_ID,
        period_start: '2026-03-01',
        period_end: '2026-03-15',
      }),
    );
    expect(res.status).toBe(201);
  });
});

/* --- DETAIL --- */
describe('GET /api/timesheet-batches/[batchId]', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const res = await GET_DETAIL(makeRequest('/api/timesheet-batches/x'), batchCtx());
    expect(res.status).toBe(401);
  });

  it('returns batch on success', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { timesheet_batches: { data: sampleBatch, error: null } },
      }),
      error: null,
    });
    const res = await GET_DETAIL(makeRequest('/api/timesheet-batches/x'), batchCtx());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('draft');
  });

  it('returns 500 on DB error', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { timesheet_batches: { data: null, error: { message: 'err' } } },
      }),
      error: null,
    });
    const res = await GET_DETAIL(makeRequest('/api/timesheet-batches/x'), batchCtx());
    expect(res.status).toBe(500);
  });
});

describe('DELETE /api/timesheet-batches/[batchId]', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const res = await DELETE(makeRequest('/api/timesheet-batches/x'), batchCtx());
    expect(res.status).toBe(401);
  });

  it('returns 204 on success', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({ tables: { timesheet_batches: { data: null, error: null } } }),
      error: null,
    });
    const res = await DELETE(makeRequest('/api/timesheet-batches/x'), batchCtx());
    expect(res.status).toBe(204);
  });
});

/* --- APPROVE --- */
describe('POST /api/timesheet-batches/[batchId]/approve', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireRole.mockResolvedValue({ userId: 'user_123', roles: ['payroll_admin'] });
  });

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    mockRequireRole.mockResolvedValue(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }));
    const res = await POST_APPROVE(makeJsonRequest('/api/x/approve', {}), batchCtx());
    expect(res.status).toBe(401);
  });

  it('returns 400 on invalid body', async () => {
    mockClerkAuth(mockAuth);
    const res = await POST_APPROVE(makeJsonRequest('/api/x/approve', { bad: true }), batchCtx());
    expect(res.status).toBe(400);
  });

  it('returns approved batch on success', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: {
          timesheet_batches: { data: { ...sampleBatch, status: 'approved' }, error: null },
        },
      }),
      error: null,
    });
    const res = await POST_APPROVE(
      makeJsonRequest('/api/x/approve', { status: 'approved' }),
      batchCtx(),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('approved');
  });

  it('returns 500 on DB error', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { timesheet_batches: { data: null, error: { message: 'err' } } },
      }),
      error: null,
    });
    const res = await POST_APPROVE(
      makeJsonRequest('/api/x/approve', { status: 'approved' }),
      batchCtx(),
    );
    expect(res.status).toBe(500);
  });
});
