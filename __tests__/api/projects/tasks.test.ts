/**
 * Tests for /api/projects/[id]/tasks (GET list, POST create).
 *
 * Covers: auth, pagination, filters (milestone_id, status, assigned_user_id),
 * creation, validation, invalid JSON, DB errors.
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
import { GET, POST } from '@/app/api/projects/[id]/tasks/route';
import { createUserClientSafe } from '@/lib/supabase/server';

const mockAuth = vi.mocked(auth);
const mockCreateUserClientSafe = vi.mocked(createUserClientSafe);

function makeContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

const sampleTask = {
  id: 'task-1',
  project_id: 'proj-1',
  title: 'Install electrical panels',
  description: 'Main panel and sub-panel for floors 1-3',
  status: 'todo',
  priority: 'high',
  assigned_user_id: 'user_abc',
  milestone_id: 'ms-1',
  start_at: '2026-03-10',
  due_at: '2026-03-20',
  completed_at: null,
  blocked_reason: null,
  created_by: 'user_test_123',
  created_at: '2026-03-01T00:00:00Z',
  updated_at: '2026-03-01T00:00:00Z',
};

/* ─── GET /api/projects/[id]/tasks ─── */
describe('GET /api/projects/[id]/tasks', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const res = await GET(makeRequest('/api/projects/proj-1/tasks'), makeContext('proj-1'));
    expect(res.status).toBe(401);
  });

  it('returns paginated tasks', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { tasks: { data: [sampleTask], error: null, count: 1 } },
      }),
      error: null,
    });

    const res = await GET(makeRequest('/api/projects/proj-1/tasks'), makeContext('proj-1'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].title).toBe('Install electrical panels');
  });

  it('passes filter params', async () => {
    mockClerkAuth(mockAuth);
    const client = mockSupabaseClient({
      tables: { tasks: { data: [], error: null, count: 0 } },
    });
    mockCreateUserClientSafe.mockResolvedValue({ client: client, error: null });

    const res = await GET(
      makeRequest('/api/projects/proj-1/tasks?status=done&milestone_id=ms-1&assigned_user_id=u1'),
      makeContext('proj-1'),
    );
    expect(res.status).toBe(200);
    expect(client.from).toHaveBeenCalledWith('tasks');
  });

  it('returns 500 on DB error', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { tasks: { data: null, error: { message: 'DB error' } } },
      }),
      error: null,
    });

    const res = await GET(makeRequest('/api/projects/proj-1/tasks'), makeContext('proj-1'));
    expect(res.status).toBe(500);
  });
});

/* ─── POST /api/projects/[id]/tasks ─── */
describe('POST /api/projects/[id]/tasks', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const res = await POST(
      makeJsonRequest('/api/projects/proj-1/tasks', { title: 'Test' }),
      makeContext('proj-1'),
    );
    expect(res.status).toBe(401);
  });

  it('creates a task', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { tasks: { data: sampleTask, error: null } },
      }),
      error: null,
    });

    const res = await POST(
      makeJsonRequest('/api/projects/proj-1/tasks', {
        title: 'Install electrical panels',
        priority: 'high',
        milestone_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      }),
      makeContext('proj-1'),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.title).toBe('Install electrical panels');
  });

  it('returns 400 for missing title', async () => {
    mockClerkAuth(mockAuth);
    const res = await POST(
      makeJsonRequest('/api/projects/proj-1/tasks', { priority: 'high' }),
      makeContext('proj-1'),
    );
    expect(res.status).toBe(400);
  });

  it('returns 400 for empty title', async () => {
    mockClerkAuth(mockAuth);
    const res = await POST(
      makeJsonRequest('/api/projects/proj-1/tasks', { title: '' }),
      makeContext('proj-1'),
    );
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid JSON', async () => {
    mockClerkAuth(mockAuth);
    const res = await POST(
      makeRequest('/api/projects/proj-1/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{bad',
      }),
      makeContext('proj-1'),
    );
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid priority value', async () => {
    mockClerkAuth(mockAuth);
    const res = await POST(
      makeJsonRequest('/api/projects/proj-1/tasks', {
        title: 'Test',
        priority: 'super_urgent',
      }),
      makeContext('proj-1'),
    );
    expect(res.status).toBe(400);
  });

  it('returns 500 on DB insert error', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { tasks: { data: null, error: { message: 'Insert failed' } } },
      }),
      error: null,
    });

    const res = await POST(
      makeJsonRequest('/api/projects/proj-1/tasks', { title: 'Test' }),
      makeContext('proj-1'),
    );
    expect(res.status).toBe(500);
  });
});
