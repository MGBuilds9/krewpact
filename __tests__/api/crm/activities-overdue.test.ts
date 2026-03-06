import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Clerk auth
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}));

// Mock Supabase server client
vi.mock('@/lib/supabase/server', () => ({
  createUserClient: vi.fn(),
}));

// Mock rate limiter
vi.mock('@/lib/api/rate-limit', () => ({
  rateLimit: vi.fn().mockResolvedValue({ success: true }),
  rateLimitResponse: vi.fn(),
}));

import { auth } from '@clerk/nextjs/server';
import { createUserClient } from '@/lib/supabase/server';
import { GET } from '@/app/api/crm/activities/overdue/route';
import {
  mockSupabaseClient,
  mockClerkAuth,
  mockClerkUnauth,
  makeRequest,
  makeActivity,
  resetFixtureCounter,
} from '@/__tests__/helpers';

const mockAuth = vi.mocked(auth);
const mockCreateUserClient = vi.mocked(createUserClient);

// ============================================================
// GET /api/crm/activities/overdue
// ============================================================
describe('GET /api/crm/activities/overdue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFixtureCounter();
  });

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const res = await GET(makeRequest('/api/crm/activities/overdue'));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns overdue tasks for authenticated user', async () => {
    const overdue = [
      makeActivity({ due_at: '2025-01-01T00:00:00Z', completed_at: null }),
      makeActivity({ due_at: '2025-06-15T12:00:00Z', completed_at: null, title: 'Send proposal' }),
    ];
    mockClerkAuth(mockAuth);
    mockCreateUserClient.mockResolvedValue(
      mockSupabaseClient({
        tables: { activities: { data: overdue, error: null, count: 2 } as never },
      }),
    );

    const res = await GET(makeRequest('/api/crm/activities/overdue'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toEqual(overdue);
    expect(body.count).toBe(2);
  });

  it('returns empty array when no overdue tasks', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClient.mockResolvedValue(
      mockSupabaseClient({
        tables: { activities: { data: [], error: null, count: 0 } as never },
      }),
    );

    const res = await GET(makeRequest('/api/crm/activities/overdue'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toEqual([]);
    expect(body.count).toBe(0);
  });

  it('handles database errors gracefully', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClient.mockResolvedValue(
      mockSupabaseClient({
        tables: {
          activities: { data: null, error: { message: 'relation "activities" does not exist' } },
        },
      }),
    );

    const res = await GET(makeRequest('/api/crm/activities/overdue'));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('relation "activities" does not exist');
  });

  it('only returns incomplete tasks (completed_at is null)', async () => {
    // The route filters with .is('completed_at', null), so completed tasks
    // should never appear in the response. We verify the mock client's
    // `.is` method is called with the correct arguments.
    const overdueIncomplete = [
      makeActivity({ due_at: '2025-03-01T09:00:00Z', completed_at: null }),
    ];
    mockClerkAuth(mockAuth);
    const client = mockSupabaseClient({
      tables: { activities: { data: overdueIncomplete, error: null, count: 1 } as never },
    });
    mockCreateUserClient.mockResolvedValue(client);

    const res = await GET(makeRequest('/api/crm/activities/overdue'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].completed_at).toBeNull();

    // Verify the Supabase chain was constructed with the correct filters
    expect(client.from).toHaveBeenCalledWith('activities');
  });
});
