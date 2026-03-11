/**
 * Tests for /api/projects/[id]/tasks/[taskId]/dependencies (GET, POST, DELETE).
 *
 * Covers: auth, list, create, validation (missing field), delete, missing param, DB errors.
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
import { GET, POST, DELETE } from '@/app/api/projects/[id]/tasks/[taskId]/dependencies/route';
import {
  mockSupabaseClient,
  mockClerkAuth,
  mockClerkUnauth,
  makeRequest,
  makeJsonRequest,
} from '@/__tests__/helpers';

const mockAuth = vi.mocked(auth);
const mockCreateUserClientSafe = vi.mocked(createUserClientSafe);

// Valid UUIDs required because taskDependencyCreateSchema validates task_id as UUID
const TASK_UUID = 'a1b2c3d4-e5f6-4890-abcd-ef1234567890';
const DEP_TASK_UUID = 'b2c3d4e5-f6a1-4890-abcd-ef1234567891';

function makeContext(id: string, taskId: string) {
  return { params: Promise.resolve({ id, taskId }) };
}

const sampleDep = {
  id: 'dep-1',
  task_id: TASK_UUID,
  depends_on_task_id: DEP_TASK_UUID,
  dependency_type: 'finish_to_start',
  created_at: '2026-03-01T00:00:00Z',
};

/* ─── GET /api/projects/[id]/tasks/[taskId]/dependencies ─── */
describe('GET /api/projects/[id]/tasks/[taskId]/dependencies', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const res = await GET(
      makeRequest(`/api/projects/proj-1/tasks/${TASK_UUID}/dependencies`),
      makeContext('proj-1', TASK_UUID),
    );
    expect(res.status).toBe(401);
  });

  it('returns dependencies for task', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { task_dependencies: { data: [sampleDep], error: null } },
      }),
      error: null,
    });

    const res = await GET(
      makeRequest(`/api/projects/proj-1/tasks/${TASK_UUID}/dependencies`),
      makeContext('proj-1', TASK_UUID),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].depends_on_task_id).toBe(DEP_TASK_UUID);
  });

  it('returns empty array when no dependencies', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { task_dependencies: { data: [], error: null } },
      }),
      error: null,
    });

    const res = await GET(
      makeRequest(`/api/projects/proj-1/tasks/${TASK_UUID}/dependencies`),
      makeContext('proj-1', TASK_UUID),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(0);
  });

  it('returns 500 on DB error', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { task_dependencies: { data: null, error: { message: 'DB error' } } },
      }),
      error: null,
    });

    const res = await GET(
      makeRequest(`/api/projects/proj-1/tasks/${TASK_UUID}/dependencies`),
      makeContext('proj-1', TASK_UUID),
    );
    expect(res.status).toBe(500);
  });
});

/* ─── POST /api/projects/[id]/tasks/[taskId]/dependencies ─── */
describe('POST /api/projects/[id]/tasks/[taskId]/dependencies', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const res = await POST(
      makeJsonRequest(`/api/projects/proj-1/tasks/${TASK_UUID}/dependencies`, {
        depends_on_task_id: DEP_TASK_UUID,
      }),
      makeContext('proj-1', TASK_UUID),
    );
    expect(res.status).toBe(401);
  });

  it('creates a dependency', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { task_dependencies: { data: sampleDep, error: null } },
      }),
      error: null,
    });

    const res = await POST(
      makeJsonRequest(`/api/projects/proj-1/tasks/${TASK_UUID}/dependencies`, {
        depends_on_task_id: DEP_TASK_UUID,
        dependency_type: 'finish_to_start',
      }),
      makeContext('proj-1', TASK_UUID),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.dependency_type).toBe('finish_to_start');
  });

  it('returns 400 for missing depends_on_task_id', async () => {
    mockClerkAuth(mockAuth);
    const res = await POST(
      makeJsonRequest(`/api/projects/proj-1/tasks/${TASK_UUID}/dependencies`, {}),
      makeContext('proj-1', TASK_UUID),
    );
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid JSON', async () => {
    mockClerkAuth(mockAuth);
    const res = await POST(
      makeRequest(`/api/projects/proj-1/tasks/${TASK_UUID}/dependencies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{bad',
      }),
      makeContext('proj-1', TASK_UUID),
    );
    expect(res.status).toBe(400);
  });

  it('returns 500 on DB insert error', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { task_dependencies: { data: null, error: { message: 'Insert failed' } } },
      }),
      error: null,
    });

    const res = await POST(
      makeJsonRequest(`/api/projects/proj-1/tasks/${TASK_UUID}/dependencies`, {
        depends_on_task_id: DEP_TASK_UUID,
      }),
      makeContext('proj-1', TASK_UUID),
    );
    expect(res.status).toBe(500);
  });
});

/* ─── DELETE /api/projects/[id]/tasks/[taskId]/dependencies ─── */
describe('DELETE /api/projects/[id]/tasks/[taskId]/dependencies', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const res = await DELETE(
      makeRequest(`/api/projects/proj-1/tasks/${TASK_UUID}/dependencies?dependency_id=dep-1`, {
        method: 'DELETE',
      }),
      makeContext('proj-1', TASK_UUID),
    );
    expect(res.status).toBe(401);
  });

  it('deletes a dependency', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { task_dependencies: { data: null, error: null } },
      }),
      error: null,
    });

    const res = await DELETE(
      makeRequest(`/api/projects/proj-1/tasks/${TASK_UUID}/dependencies?dependency_id=dep-1`, {
        method: 'DELETE',
      }),
      makeContext('proj-1', TASK_UUID),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it('returns 400 when dependency_id param missing', async () => {
    mockClerkAuth(mockAuth);
    const res = await DELETE(
      makeRequest(`/api/projects/proj-1/tasks/${TASK_UUID}/dependencies`, { method: 'DELETE' }),
      makeContext('proj-1', TASK_UUID),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('dependency_id');
  });

  it('returns 500 on DB error', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { task_dependencies: { data: null, error: { message: 'DB error' } } },
      }),
      error: null,
    });

    const res = await DELETE(
      makeRequest(`/api/projects/proj-1/tasks/${TASK_UUID}/dependencies?dependency_id=dep-1`, {
        method: 'DELETE',
      }),
      makeContext('proj-1', TASK_UUID),
    );
    expect(res.status).toBe(500);
  });
});
