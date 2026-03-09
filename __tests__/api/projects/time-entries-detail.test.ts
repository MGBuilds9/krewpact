/**
 * Tests for /api/projects/[id]/time-entries/[entryId] (PATCH, DELETE).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@clerk/nextjs/server', () => ({ auth: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createUserClient: vi.fn() }));
vi.mock('@/lib/api/rate-limit', () => ({
  rateLimit: vi.fn().mockResolvedValue({ success: true }),
  rateLimitResponse: vi.fn(),
}));

import { auth } from '@clerk/nextjs/server';
import { createUserClient } from '@/lib/supabase/server';
import { PATCH, DELETE } from '@/app/api/projects/[id]/time-entries/[entryId]/route';
import {
  mockSupabaseClient,
  mockClerkAuth,
  mockClerkUnauth,
  makeRequest,
  makeJsonRequest,
  TEST_IDS,
} from '@/__tests__/helpers';

const mockAuth = vi.mocked(auth);
const mockCreateUserClient = vi.mocked(createUserClient);
const PROJECT_ID = TEST_IDS.PROJECT_ID;
const ENTRY_ID = '00000000-0000-4000-a000-000000000201';

function ctx(id: string = PROJECT_ID, entryId: string = ENTRY_ID) {
  return { params: Promise.resolve({ id, entryId }) };
}

const sampleEntry = {
  id: ENTRY_ID,
  project_id: PROJECT_ID,
  user_id: TEST_IDS.USER_ID,
  work_date: '2026-03-01',
  hours_regular: 8,
  hours_overtime: 2,
  cost_code: 'CC-100',
  notes: 'Updated',
  created_at: '2026-03-01T08:00:00Z',
  updated_at: '2026-03-01T10:00:00Z',
};

describe('PATCH /api/projects/[id]/time-entries/[entryId]', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const res = await PATCH(
      makeJsonRequest('/api/x/time-entries/y', { hours_regular: 6 }, 'PATCH'),
      ctx(),
    );
    expect(res.status).toBe(401);
  });

  it('returns 400 on invalid body', async () => {
    mockClerkAuth(mockAuth);
    const res = await PATCH(
      makeJsonRequest('/api/x/time-entries/y', { hours_regular: 'not-a-number' }, 'PATCH'),
      ctx(),
    );
    expect(res.status).toBe(400);
  });

  it('returns updated entry on success', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClient.mockResolvedValue(
      mockSupabaseClient({ tables: { time_entries: { data: sampleEntry, error: null } } }),
    );
    const res = await PATCH(
      makeJsonRequest('/api/x/time-entries/y', { hours_overtime: 2 }, 'PATCH'),
      ctx(),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.hours_overtime).toBe(2);
  });

  it('returns 500 on DB error', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClient.mockResolvedValue(
      mockSupabaseClient({
        tables: { time_entries: { data: null, error: { message: 'update error' } } },
      }),
    );
    const res = await PATCH(
      makeJsonRequest('/api/x/time-entries/y', { hours_overtime: 2 }, 'PATCH'),
      ctx(),
    );
    expect(res.status).toBe(500);
  });
});

describe('DELETE /api/projects/[id]/time-entries/[entryId]', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const res = await DELETE(makeRequest('/api/x/time-entries/y'), ctx());
    expect(res.status).toBe(401);
  });

  it('returns 204 on success', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClient.mockResolvedValue(
      mockSupabaseClient({ tables: { time_entries: { data: null, error: null } } }),
    );
    const res = await DELETE(makeRequest('/api/x/time-entries/y'), ctx());
    expect(res.status).toBe(204);
  });

  it('returns 500 on DB error', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClient.mockResolvedValue(
      mockSupabaseClient({
        tables: { time_entries: { data: null, error: { message: 'delete error' } } },
      }),
    );
    const res = await DELETE(makeRequest('/api/x/time-entries/y'), ctx());
    expect(res.status).toBe(500);
  });
});
