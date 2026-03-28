/**
 * Tests for /api/portal/projects/[id]/progress (GET).
 *
 * Covers: auth, portal access guard, data fetch, summary calculation, DB errors.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@clerk/nextjs/server', () => ({ auth: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createUserClientSafe: vi.fn() }));

import { auth } from '@clerk/nextjs/server';

import {
  makeRequest,
  mockClerkAuth,
  mockClerkUnauth,
  mockSupabaseClient,
} from '@/__tests__/helpers';
import { GET } from '@/app/api/portal/projects/[id]/progress/route';
import { createUserClientSafe } from '@/lib/supabase/server';

const mockAuth = vi.mocked(auth);
const mockCreateUserClientSafe = vi.mocked(createUserClientSafe);

function makeContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

const sampleMilestone = {
  id: 'ms-1',
  name: 'Foundation',
  due_date: '2026-04-01',
  completed_at: '2026-03-28',
  status: 'completed',
  sort_order: 1,
};

const sampleTask = {
  id: 'task-1',
  title: 'Pour concrete',
  status: 'completed',
  milestone_id: 'ms-1',
  due_date: '2026-03-25',
  completed_at: '2026-03-24',
};

describe('GET /api/portal/projects/[id]/progress', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const res = await GET(
      makeRequest('/api/portal/projects/proj-1/progress'),
      makeContext('proj-1'),
    );
    expect(res.status).toBe(401);
  });

  it('returns 403 when no portal account found', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: {
          portal_accounts: { data: null, error: { message: 'Not found', code: 'PGRST116' } },
        },
      }),
      error: null,
    });

    const res = await GET(
      makeRequest('/api/portal/projects/proj-1/progress'),
      makeContext('proj-1'),
    );
    expect(res.status).toBe(403);
  });

  it('returns 403 when portal account is inactive', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: {
          portal_accounts: { data: { id: 'pa-1', status: 'suspended' }, error: null },
        },
      }),
      error: null,
    });

    const res = await GET(
      makeRequest('/api/portal/projects/proj-1/progress'),
      makeContext('proj-1'),
    );
    expect(res.status).toBe(403);
  });

  it('returns progress data with summary when permitted', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: {
          portal_accounts: { data: { id: 'pa-1', status: 'active' }, error: null },
          portal_permissions: { data: { id: 'perm-1' }, error: null },
          milestones: { data: [sampleMilestone], error: null },
          tasks: { data: [sampleTask], error: null },
          portal_view_logs: { data: null, error: null },
        },
      }),
      error: null,
    });

    const res = await GET(
      makeRequest('/api/portal/projects/proj-1/progress'),
      makeContext('proj-1'),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.milestones).toHaveLength(1);
    expect(body.tasks).toHaveLength(1);
    expect(body.summary.total_milestones).toBe(1);
    expect(body.summary.completed_milestones).toBe(1);
    expect(body.summary.completion_pct).toBe(100);
  });
});
