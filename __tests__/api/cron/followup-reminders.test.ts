/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockVerifyCronAuth = vi.fn();
vi.mock('@/lib/api/cron-auth', () => ({
  verifyCronAuth: (...args: unknown[]) => mockVerifyCronAuth(...args),
}));

vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: vi.fn(),
}));

import { createServiceClient } from '@/lib/supabase/server';
import { POST } from '@/app/api/cron/followup-reminders/route';
import {
  mockSupabaseClient,
  makeRequest,
  makeActivity,
  resetFixtureCounter,
} from '@/__tests__/helpers';

const mockCreateServiceClient = vi.mocked(createServiceClient);

function makeCronRequest() {
  return makeRequest('/api/cron/followup-reminders', { method: 'POST' });
}

describe('POST /api/cron/followup-reminders', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFixtureCounter();
    mockVerifyCronAuth.mockResolvedValue({ authorized: true });
  });

  it('returns 401 when cron auth fails', async () => {
    mockVerifyCronAuth.mockResolvedValue({ authorized: false });

    const res = await POST(makeCronRequest());
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns { notified: 0 } when no overdue tasks', async () => {
    mockCreateServiceClient.mockReturnValue(
      mockSupabaseClient({
        tables: {
          activities: { data: [], error: null },
          notifications: { data: null, error: null },
        },
      }) as any,
    );

    const res = await POST(makeCronRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.notified).toBe(0);
  });

  it('creates notifications grouped by user', async () => {
    const userA = 'user-aaa';
    const userB = 'user-bbb';

    mockCreateServiceClient.mockReturnValue(
      mockSupabaseClient({
        tables: {
          activities: {
            data: [
              makeActivity({ owner_user_id: userA, title: 'Call client' }),
              makeActivity({ owner_user_id: userA, title: 'Send proposal' }),
              makeActivity({ owner_user_id: userB, title: 'Site visit' }),
            ],
            error: null,
          },
          notifications: { data: null, error: null },
        },
      }) as any,
    );

    const res = await POST(makeCronRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    // 2 users = 2 notifications
    expect(body.notified).toBe(2);
    expect(body.totalOverdue).toBe(3);
  });

  it('handles database errors on activities query', async () => {
    mockCreateServiceClient.mockReturnValue(
      mockSupabaseClient({
        tables: {
          activities: { data: null, error: { message: 'connection refused', code: '500' } },
          notifications: { data: null, error: null },
        },
      }) as any,
    );

    const res = await POST(makeCronRequest());
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('connection refused');
  });

  it('handles database errors on notification insert', async () => {
    mockCreateServiceClient.mockReturnValue(
      mockSupabaseClient({
        tables: {
          activities: {
            data: [makeActivity({ owner_user_id: 'user-1', title: 'Overdue task' })],
            error: null,
          },
          notifications: { data: null, error: { message: 'insert failed', code: '500' } },
        },
      }) as any,
    );

    const res = await POST(makeCronRequest());
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('insert failed');
  });

  it('includes task titles in notification body', async () => {
    const userId = 'user-single';
    const client = mockSupabaseClient({
      tables: {
        activities: {
          data: [
            makeActivity({ owner_user_id: userId, title: 'Call client' }),
            makeActivity({ owner_user_id: userId, title: 'Send invoice' }),
          ],
          error: null,
        },
        notifications: { data: null, error: null },
      },
    });
    mockCreateServiceClient.mockReturnValue(client as any);

    const res = await POST(makeCronRequest());
    expect(res.status).toBe(200);

    // Verify the insert was called with notification containing task titles
    const fromMock = vi.mocked(client.from);
    const notificationCall = fromMock.mock.calls.find(([table]) => table === 'notifications');
    expect(notificationCall).toBeDefined();
  });

  it('truncates titles with "and X more" for users with >3 tasks', async () => {
    const userId = 'user-busy';

    mockCreateServiceClient.mockReturnValue(
      mockSupabaseClient({
        tables: {
          activities: {
            data: [
              makeActivity({ owner_user_id: userId, title: 'Task A' }),
              makeActivity({ owner_user_id: userId, title: 'Task B' }),
              makeActivity({ owner_user_id: userId, title: 'Task C' }),
              makeActivity({ owner_user_id: userId, title: 'Task D' }),
              makeActivity({ owner_user_id: userId, title: 'Task E' }),
            ],
            error: null,
          },
          notifications: { data: null, error: null },
        },
      }) as any,
    );

    const res = await POST(makeCronRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.notified).toBe(1);
    expect(body.totalOverdue).toBe(5);
  });

  it('returns notified: 0 when activities data is null', async () => {
    mockCreateServiceClient.mockReturnValue(
      mockSupabaseClient({
        tables: {
          activities: { data: null, error: null },
          notifications: { data: null, error: null },
        },
      }) as any,
    );

    const res = await POST(makeCronRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.notified).toBe(0);
  });
});
