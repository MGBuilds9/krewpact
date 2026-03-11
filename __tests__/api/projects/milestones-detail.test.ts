/**
 * Tests for /api/projects/[id]/milestones/[msId] (GET single, PATCH, DELETE).
 *
 * Covers: auth, detail fetch, update, validation, delete, not found, DB errors.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@clerk/nextjs/server', () => ({ auth: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createUserClientSafe: vi.fn() }));
vi.mock('@/lib/api/rate-limit', () => ({
  rateLimit: vi.fn().mockResolvedValue({ success: true }),
  rateLimitResponse: vi.fn(),
}));

import { auth } from '@clerk/nextjs/server';
import { createUserClientSafe } from '@/lib/supabase/server';
import { GET, PATCH, DELETE } from '@/app/api/projects/[id]/milestones/[msId]/route';
import {
  mockSupabaseClient,
  mockClerkAuth,
  mockClerkUnauth,
  makeRequest,
  makeJsonRequest,
} from '@/__tests__/helpers';

const mockAuth = vi.mocked(auth);
const mockCreateUserClientSafe = vi.mocked(createUserClientSafe);

function makeContext(id: string, msId: string) {
  return { params: Promise.resolve({ id, msId }) };
}

const sampleMilestone = {
  id: 'ms-1',
  project_id: 'proj-1',
  milestone_name: 'Foundation Complete',
  milestone_order: 1,
  planned_date: '2026-04-01',
  actual_date: null,
  owner_user_id: null,
  status: 'draft',
  created_at: '2026-03-01T00:00:00Z',
  updated_at: '2026-03-01T00:00:00Z',
};

/* ─── GET /api/projects/[id]/milestones/[msId] ─── */
describe('GET /api/projects/[id]/milestones/[msId]', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const res = await GET(
      makeRequest('/api/projects/proj-1/milestones/ms-1'),
      makeContext('proj-1', 'ms-1'),
    );
    expect(res.status).toBe(401);
  });

  it('returns milestone by id', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { milestones: { data: sampleMilestone, error: null } },
      }),
      error: null,
    });

    const res = await GET(
      makeRequest('/api/projects/proj-1/milestones/ms-1'),
      makeContext('proj-1', 'ms-1'),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.milestone_name).toBe('Foundation Complete');
  });

  it('returns 404 when not found', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: {
          milestones: { data: null, error: { message: 'Not found', code: 'PGRST116' } },
        },
      }),
      error: null,
    });

    const res = await GET(
      makeRequest('/api/projects/proj-1/milestones/missing'),
      makeContext('proj-1', 'missing'),
    );
    expect(res.status).toBe(404);
  });

  it('returns 500 on DB error', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { milestones: { data: null, error: { message: 'DB error', code: 'OTHER' } } },
      }),
      error: null,
    });

    const res = await GET(
      makeRequest('/api/projects/proj-1/milestones/ms-1'),
      makeContext('proj-1', 'ms-1'),
    );
    expect(res.status).toBe(500);
  });
});

/* ─── PATCH /api/projects/[id]/milestones/[msId] ─── */
describe('PATCH /api/projects/[id]/milestones/[msId]', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const res = await PATCH(
      makeJsonRequest('/api/projects/proj-1/milestones/ms-1', { status: 'approved' }, 'PATCH'),
      makeContext('proj-1', 'ms-1'),
    );
    expect(res.status).toBe(401);
  });

  it('updates milestone', async () => {
    mockClerkAuth(mockAuth);
    const updated = { ...sampleMilestone, status: 'approved' };
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({ tables: { milestones: { data: updated, error: null } } }),
      error: null,
    });

    const res = await PATCH(
      makeJsonRequest('/api/projects/proj-1/milestones/ms-1', { status: 'approved' }, 'PATCH'),
      makeContext('proj-1', 'ms-1'),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('approved');
  });

  it('returns 400 for invalid JSON', async () => {
    mockClerkAuth(mockAuth);
    const res = await PATCH(
      makeRequest('/api/projects/proj-1/milestones/ms-1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: 'not json',
      }),
      makeContext('proj-1', 'ms-1'),
    );
    expect(res.status).toBe(400);
  });

  it('returns 404 when not found', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: {
          milestones: { data: null, error: { message: 'Not found', code: 'PGRST116' } },
        },
      }),
      error: null,
    });

    const res = await PATCH(
      makeJsonRequest(
        '/api/projects/proj-1/milestones/missing',
        { milestone_name: 'Updated' },
        'PATCH',
      ),
      makeContext('proj-1', 'missing'),
    );
    expect(res.status).toBe(404);
  });
});

/* ─── DELETE /api/projects/[id]/milestones/[msId] ─── */
describe('DELETE /api/projects/[id]/milestones/[msId]', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const res = await DELETE(
      makeRequest('/api/projects/proj-1/milestones/ms-1', { method: 'DELETE' }),
      makeContext('proj-1', 'ms-1'),
    );
    expect(res.status).toBe(401);
  });

  it('deletes milestone', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({ tables: { milestones: { data: null, error: null } } }),
      error: null,
    });

    const res = await DELETE(
      makeRequest('/api/projects/proj-1/milestones/ms-1', { method: 'DELETE' }),
      makeContext('proj-1', 'ms-1'),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it('returns 500 on DB error', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { milestones: { data: null, error: { message: 'FK constraint' } } },
      }),
      error: null,
    });

    const res = await DELETE(
      makeRequest('/api/projects/proj-1/milestones/ms-1', { method: 'DELETE' }),
      makeContext('proj-1', 'ms-1'),
    );
    expect(res.status).toBe(500);
  });
});
