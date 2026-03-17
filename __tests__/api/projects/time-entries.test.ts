/**
 * Tests for /api/projects/[id]/time-entries (GET list, POST create).
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
import { GET, POST } from '@/app/api/projects/[id]/time-entries/route';
import { createUserClientSafe } from '@/lib/supabase/server';

const mockAuth = vi.mocked(auth);
const mockCreateUserClientSafe = vi.mocked(createUserClientSafe);
const PROJECT_ID = TEST_IDS.PROJECT_ID;

function ctx(id: string = PROJECT_ID) {
  return { params: Promise.resolve({ id }) };
}

const sampleEntry = {
  id: '00000000-0000-4000-a000-000000000101',
  project_id: PROJECT_ID,
  task_id: null,
  user_id: TEST_IDS.USER_ID,
  work_date: '2026-03-01',
  hours_regular: 8,
  hours_overtime: 0,
  cost_code: 'CC-100',
  notes: 'Framing work',
  source: 'manual',
  created_at: '2026-03-01T08:00:00Z',
  updated_at: '2026-03-01T08:00:00Z',
};

describe('GET /api/projects/[id]/time-entries', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const res = await GET(makeRequest('/api/projects/p/time-entries'), ctx());
    expect(res.status).toBe(401);
  });

  it('returns paginated time entries', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { time_entries: { data: [sampleEntry], error: null, count: 1 } },
      }),
      error: null,
    });
    const res = await GET(makeRequest('/api/projects/p/time-entries'), ctx());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].hours_regular).toBe(8);
  });

  it('returns 500 on DB error', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { time_entries: { data: null, error: { message: 'DB error' }, count: null } },
      }),
      error: null,
    });
    const res = await GET(makeRequest('/api/projects/p/time-entries'), ctx());
    expect(res.status).toBe(500);
  });
});

describe('POST /api/projects/[id]/time-entries', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const res = await POST(makeJsonRequest('/api/projects/p/time-entries', {}), ctx());
    expect(res.status).toBe(401);
  });

  it('returns 400 on invalid body', async () => {
    mockClerkAuth(mockAuth);
    const res = await POST(makeJsonRequest('/api/projects/p/time-entries', { bad: true }), ctx());
    expect(res.status).toBe(400);
  });

  it('returns 201 on valid creation', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({ tables: { time_entries: { data: sampleEntry, error: null } } }),
      error: null,
    });
    const res = await POST(
      makeJsonRequest('/api/projects/p/time-entries', {
        user_id: TEST_IDS.USER_ID,
        work_date: '2026-03-01',
        hours_regular: 8,
      }),
      ctx(),
    );
    expect(res.status).toBe(201);
  });

  it('returns 500 on DB insert error', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { time_entries: { data: null, error: { message: 'insert error' } } },
      }),
      error: null,
    });
    const res = await POST(
      makeJsonRequest('/api/projects/p/time-entries', {
        user_id: TEST_IDS.USER_ID,
        work_date: '2026-03-01',
        hours_regular: 8,
      }),
      ctx(),
    );
    expect(res.status).toBe(500);
  });
});
