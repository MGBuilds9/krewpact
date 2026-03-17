/**
 * Tests for /api/projects/[id]/milestones (GET list, POST create).
 *
 * Covers: auth, pagination, creation, validation, invalid JSON, DB errors.
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
import { GET, POST } from '@/app/api/projects/[id]/milestones/route';
import { createUserClientSafe } from '@/lib/supabase/server';

const mockAuth = vi.mocked(auth);
const mockCreateUserClientSafe = vi.mocked(createUserClientSafe);

function makeContext(id: string) {
  return { params: Promise.resolve({ id }) };
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

/* ─── GET /api/projects/[id]/milestones ─── */
describe('GET /api/projects/[id]/milestones', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const res = await GET(makeRequest('/api/projects/proj-1/milestones'), makeContext('proj-1'));
    expect(res.status).toBe(401);
  });

  it('returns paginated milestones', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { milestones: { data: [sampleMilestone], error: null, count: 1 } },
      }),
      error: null,
    });

    const res = await GET(makeRequest('/api/projects/proj-1/milestones'), makeContext('proj-1'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].milestone_name).toBe('Foundation Complete');
  });

  it('respects pagination params', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { milestones: { data: [], error: null, count: 0 } },
      }),
      error: null,
    });

    const res = await GET(
      makeRequest('/api/projects/proj-1/milestones?limit=5&offset=10'),
      makeContext('proj-1'),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(0);
  });

  it('returns 500 on DB error', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { milestones: { data: null, error: { message: 'DB error' } } },
      }),
      error: null,
    });

    const res = await GET(makeRequest('/api/projects/proj-1/milestones'), makeContext('proj-1'));
    expect(res.status).toBe(500);
  });
});

/* ─── POST /api/projects/[id]/milestones ─── */
describe('POST /api/projects/[id]/milestones', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const res = await POST(
      makeJsonRequest('/api/projects/proj-1/milestones', { milestone_name: 'Test' }),
      makeContext('proj-1'),
    );
    expect(res.status).toBe(401);
  });

  it('creates a milestone', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { milestones: { data: sampleMilestone, error: null } },
      }),
      error: null,
    });

    const res = await POST(
      makeJsonRequest('/api/projects/proj-1/milestones', {
        milestone_name: 'Foundation Complete',
        milestone_order: 1,
        planned_date: '2026-04-01',
      }),
      makeContext('proj-1'),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.milestone_name).toBe('Foundation Complete');
  });

  it('returns 400 for missing milestone_name', async () => {
    mockClerkAuth(mockAuth);
    const res = await POST(
      makeJsonRequest('/api/projects/proj-1/milestones', { milestone_order: 1 }),
      makeContext('proj-1'),
    );
    expect(res.status).toBe(400);
  });

  it('returns 400 for empty milestone_name', async () => {
    mockClerkAuth(mockAuth);
    const res = await POST(
      makeJsonRequest('/api/projects/proj-1/milestones', { milestone_name: '' }),
      makeContext('proj-1'),
    );
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid JSON', async () => {
    mockClerkAuth(mockAuth);
    const res = await POST(
      makeRequest('/api/projects/proj-1/milestones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{bad',
      }),
      makeContext('proj-1'),
    );
    expect(res.status).toBe(400);
  });

  it('returns 500 on DB insert error', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { milestones: { data: null, error: { message: 'Insert failed' } } },
      }),
      error: null,
    });

    const res = await POST(
      makeJsonRequest('/api/projects/proj-1/milestones', {
        milestone_name: 'Test',
      }),
      makeContext('proj-1'),
    );
    expect(res.status).toBe(500);
  });
});
