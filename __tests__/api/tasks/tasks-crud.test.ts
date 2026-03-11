import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createUserClientSafe: vi.fn(),
}));

import { auth } from '@clerk/nextjs/server';
import { createUserClientSafe } from '@/lib/supabase/server';
import { GET, POST } from '@/app/api/tasks/route';
import { GET as GET_BY_ID, PATCH, DELETE } from '@/app/api/tasks/[id]/route';
import {
  mockSupabaseClient,
  mockClerkAuth,
  mockClerkUnauth,
  makeRequest,
  makeJsonRequest,
  makeTask,
  TEST_IDS,
} from '@/__tests__/helpers';

const mockAuth = vi.mocked(auth);
const mockCreateUserClientSafe = vi.mocked(createUserClientSafe);

const TASK_ID = TEST_IDS.TASK_ID;
const PROJECT_ID = TEST_IDS.PROJECT_ID;

function taskCtx(id: string = TASK_ID) {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockClerkAuth(mockAuth);
});

// ============================================================
// GET /api/tasks
// ============================================================

describe('GET /api/tasks', () => {
  it('returns 401 when unauthenticated', async () => {
    mockClerkUnauth(mockAuth);
    const res = await GET(makeRequest('/api/tasks'));
    expect(res.status).toBe(401);
  });

  it('returns tasks when authenticated', async () => {
    const tasks = [makeTask(), makeTask({ title: 'Second task' })];
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({ tables: { tasks: { data: tasks, error: null } } }),
      error: null,
    });
    const res = await GET(makeRequest('/api/tasks'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toEqual(tasks);
  });

  it('filters by project_id', async () => {
    const client = mockSupabaseClient({ tables: { tasks: { data: [], error: null } } });
    mockCreateUserClientSafe.mockResolvedValue({ client: client, error: null });
    const res = await GET(makeRequest(`/api/tasks?project_id=${PROJECT_ID}`));
    expect(res.status).toBe(200);
    expect(client.from).toHaveBeenCalledWith('tasks');
  });

  it('filters by status', async () => {
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({ tables: { tasks: { data: [], error: null } } }),
      error: null,
    });
    const res = await GET(makeRequest('/api/tasks?status=in_progress'));
    expect(res.status).toBe(200);
  });

  it('returns 400 for invalid status', async () => {
    const res = await GET(makeRequest('/api/tasks?status=bogus'));
    expect(res.status).toBe(400);
  });

  it('returns 500 on DB error', async () => {
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { tasks: { data: null, error: { message: 'DB fail', code: 'PGRST000' } } },
      }),
      error: null,
    });
    const res = await GET(makeRequest('/api/tasks'));
    expect(res.status).toBe(500);
  });
});

// ============================================================
// POST /api/tasks
// ============================================================

describe('POST /api/tasks', () => {
  it('returns 401 when unauthenticated', async () => {
    mockClerkUnauth(mockAuth);
    const res = await POST(
      makeJsonRequest('/api/tasks', { project_id: PROJECT_ID, title: 'Test' }),
    );
    expect(res.status).toBe(401);
  });

  it('returns 400 for missing title', async () => {
    const res = await POST(makeJsonRequest('/api/tasks', { project_id: PROJECT_ID }));
    expect(res.status).toBe(400);
  });

  it('returns 400 for missing project_id', async () => {
    const res = await POST(makeJsonRequest('/api/tasks', { title: 'Test' }));
    expect(res.status).toBe(400);
  });

  it('creates task with valid data', async () => {
    const created = makeTask({ title: 'New Task' });
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({ tables: { tasks: { data: created, error: null } } }),
      error: null,
    });
    const res = await POST(
      makeJsonRequest('/api/tasks', { project_id: PROJECT_ID, title: 'New Task' }),
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.title).toBe('New Task');
  });

  it('accepts optional fields (priority, milestone_id, due_at)', async () => {
    const created = makeTask({ title: 'Full Task', priority: 'high' });
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({ tables: { tasks: { data: created, error: null } } }),
      error: null,
    });
    const res = await POST(
      makeJsonRequest('/api/tasks', {
        project_id: PROJECT_ID,
        title: 'Full Task',
        priority: 'high',
        due_at: '2026-04-01',
      }),
    );
    expect(res.status).toBe(201);
  });

  it('returns 400 for invalid JSON body', async () => {
    const req = makeRequest('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not json',
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});

// ============================================================
// GET /api/tasks/[id]
// ============================================================

describe('GET /api/tasks/[id]', () => {
  it('returns 401 when unauthenticated', async () => {
    mockClerkUnauth(mockAuth);
    const res = await GET_BY_ID(makeRequest(`/api/tasks/${TASK_ID}`), taskCtx());
    expect(res.status).toBe(401);
  });

  it('returns task by ID', async () => {
    const task = makeTask();
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({ tables: { tasks: { data: task, error: null } } }),
      error: null,
    });
    const res = await GET_BY_ID(makeRequest(`/api/tasks/${TASK_ID}`), taskCtx());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe(task.id);
  });

  it('returns 404 for non-existent task', async () => {
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { tasks: { data: null, error: { message: 'Not found', code: 'PGRST116' } } },
      }),
      error: null,
    });
    const res = await GET_BY_ID(makeRequest(`/api/tasks/${TASK_ID}`), taskCtx());
    expect(res.status).toBe(404);
  });
});

// ============================================================
// PATCH /api/tasks/[id]
// ============================================================

describe('PATCH /api/tasks/[id]', () => {
  it('returns 401 when unauthenticated', async () => {
    mockClerkUnauth(mockAuth);
    const res = await PATCH(
      makeJsonRequest(`/api/tasks/${TASK_ID}`, { title: 'Updated' }, 'PATCH'),
      taskCtx(),
    );
    expect(res.status).toBe(401);
  });

  it('updates task status', async () => {
    const updated = makeTask({ status: 'in_progress' });
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({ tables: { tasks: { data: updated, error: null } } }),
      error: null,
    });
    const res = await PATCH(
      makeJsonRequest(`/api/tasks/${TASK_ID}`, { status: 'in_progress' }, 'PATCH'),
      taskCtx(),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('in_progress');
  });

  it('updates task to blocked status', async () => {
    const updated = makeTask({ status: 'blocked' });
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({ tables: { tasks: { data: updated, error: null } } }),
      error: null,
    });
    const res = await PATCH(
      makeJsonRequest(`/api/tasks/${TASK_ID}`, { status: 'blocked' }, 'PATCH'),
      taskCtx(),
    );
    expect(res.status).toBe(200);
  });

  it('rejects invalid status value', async () => {
    const res = await PATCH(
      makeJsonRequest(`/api/tasks/${TASK_ID}`, { status: 'invalid_status' }, 'PATCH'),
      taskCtx(),
    );
    expect(res.status).toBe(400);
  });

  it('returns 404 for non-existent task', async () => {
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { tasks: { data: null, error: { message: 'Not found', code: 'PGRST116' } } },
      }),
      error: null,
    });
    const res = await PATCH(
      makeJsonRequest(`/api/tasks/${TASK_ID}`, { title: 'Updated' }, 'PATCH'),
      taskCtx(),
    );
    expect(res.status).toBe(404);
  });

  it('returns 400 for invalid JSON', async () => {
    const req = makeRequest(`/api/tasks/${TASK_ID}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: 'not json',
    });
    const res = await PATCH(req, taskCtx());
    expect(res.status).toBe(400);
  });
});

// ============================================================
// DELETE /api/tasks/[id]
// ============================================================

describe('DELETE /api/tasks/[id]', () => {
  it('returns 401 when unauthenticated', async () => {
    mockClerkUnauth(mockAuth);
    const res = await DELETE(makeRequest(`/api/tasks/${TASK_ID}`), taskCtx());
    expect(res.status).toBe(401);
  });

  it('deletes task successfully', async () => {
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({ tables: { tasks: { data: null, error: null } } }),
      error: null,
    });
    const res = await DELETE(makeRequest(`/api/tasks/${TASK_ID}`), taskCtx());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it('returns 500 on DB error', async () => {
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { tasks: { data: null, error: { message: 'FK violation', code: '23503' } } },
      }),
      error: null,
    });
    const res = await DELETE(makeRequest(`/api/tasks/${TASK_ID}`), taskCtx());
    expect(res.status).toBe(500);
  });
});
