import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock Clerk auth
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}));

// Mock Supabase server client
vi.mock('@/lib/supabase/server', () => ({
  createUserClientSafe: vi.fn(),
}));

import { auth } from '@clerk/nextjs/server';

import {
  makeActivity,
  makeRequest,
  mockClerkAuth,
  mockClerkUnauth,
  mockSupabaseClient,
  resetFixtureCounter,
  TEST_IDS,
} from '@/__tests__/helpers';
import { GET } from '@/app/api/crm/activities/my-tasks/route';
import { createUserClientSafe } from '@/lib/supabase/server';

const mockAuth = vi.mocked(auth);
const mockCreateUserClientSafe = vi.mocked(createUserClientSafe);

// ============================================================
// GET /api/crm/activities/my-tasks
// ============================================================
describe('GET /api/crm/activities/my-tasks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFixtureCounter();
  });

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const res = await GET(makeRequest('/api/crm/activities/my-tasks'));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns task list for authenticated user (filter=all)', async () => {
    const tasks = [
      makeActivity({ title: 'Task 1' }),
      makeActivity({ title: 'Task 2', completed_at: '2026-02-16T12:00:00Z' }),
    ];
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { activities: { data: tasks, error: null } },
      }),
      error: null,
    });

    const res = await GET(makeRequest('/api/crm/activities/my-tasks?filter=all'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toEqual(tasks);
    expect(typeof body.total).toBe('number');
    expect(typeof body.hasMore).toBe('boolean');
  });

  it('filters by filter=overdue', async () => {
    const overdueTasks = [makeActivity({ title: 'Overdue task', due_at: '2026-01-01T10:00:00Z' })];
    mockClerkAuth(mockAuth);
    const client = mockSupabaseClient({
      tables: { activities: { data: overdueTasks, error: null } },
    });
    mockCreateUserClientSafe.mockResolvedValue({ client: client, error: null });

    const res = await GET(makeRequest('/api/crm/activities/my-tasks?filter=overdue'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toEqual(overdueTasks);
    expect(client.from).toHaveBeenCalledWith('activities');
  });

  it('filters by filter=today', async () => {
    const todayTasks = [makeActivity({ title: 'Today task', due_at: new Date().toISOString() })];
    mockClerkAuth(mockAuth);
    const client = mockSupabaseClient({
      tables: { activities: { data: todayTasks, error: null } },
    });
    mockCreateUserClientSafe.mockResolvedValue({ client: client, error: null });

    const res = await GET(makeRequest('/api/crm/activities/my-tasks?filter=today'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toEqual(todayTasks);
    expect(client.from).toHaveBeenCalledWith('activities');
  });

  it('filters by filter=upcoming', async () => {
    const upcomingTasks = [
      makeActivity({ title: 'Upcoming task', due_at: '2027-06-01T10:00:00Z' }),
    ];
    mockClerkAuth(mockAuth);
    const client = mockSupabaseClient({
      tables: { activities: { data: upcomingTasks, error: null } },
    });
    mockCreateUserClientSafe.mockResolvedValue({ client: client, error: null });

    const res = await GET(makeRequest('/api/crm/activities/my-tasks?filter=upcoming'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toEqual(upcomingTasks);
    expect(client.from).toHaveBeenCalledWith('activities');
  });

  it('filters by filter=completed', async () => {
    const completedTasks = [
      makeActivity({
        title: 'Done task',
        completed_at: '2026-02-16T12:00:00Z',
      }),
    ];
    mockClerkAuth(mockAuth);
    const client = mockSupabaseClient({
      tables: { activities: { data: completedTasks, error: null } },
    });
    mockCreateUserClientSafe.mockResolvedValue({ client: client, error: null });

    const res = await GET(makeRequest('/api/crm/activities/my-tasks?filter=completed'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toEqual(completedTasks);
    expect(client.from).toHaveBeenCalledWith('activities');
  });

  it('filters by entity_type', async () => {
    const leadTasks = [
      makeActivity({
        title: 'Lead follow-up',
        lead_id: TEST_IDS.LEAD_ID,
        opportunity_id: null,
      }),
    ];
    mockClerkAuth(mockAuth);
    const client = mockSupabaseClient({
      tables: { activities: { data: leadTasks, error: null } },
    });
    mockCreateUserClientSafe.mockResolvedValue({ client: client, error: null });

    const res = await GET(makeRequest('/api/crm/activities/my-tasks?entity_type=lead'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toEqual(leadTasks);
    expect(client.from).toHaveBeenCalledWith('activities');
  });

  it('returns empty array when no tasks', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: { activities: { data: [], error: null } },
      }),
      error: null,
    });

    const res = await GET(makeRequest('/api/crm/activities/my-tasks?filter=all'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toEqual([]);
    expect(body.total).toBe(0);
    expect(body.hasMore).toBe(false);
  });

  it('returns 400 for invalid filter value', async () => {
    mockClerkAuth(mockAuth);

    const res = await GET(makeRequest('/api/crm/activities/my-tasks?filter=invalid_filter'));
    expect(res.status).toBe(400);
  });

  it('handles database errors gracefully', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: {
          activities: {
            data: null,
            error: { message: 'Database connection failed', code: '500' },
          },
        },
      }),
      error: null,
    });

    const res = await GET(makeRequest('/api/crm/activities/my-tasks?filter=all'));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });
});
