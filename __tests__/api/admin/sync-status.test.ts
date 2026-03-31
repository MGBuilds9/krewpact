import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createUserClientSafe: vi.fn(),
}));

vi.mock('@/lib/api/rate-limit', () => ({
  rateLimit: vi.fn().mockResolvedValue({ success: true }),
  rateLimitResponse: vi.fn(),
}));

vi.mock('@/lib/api/org', () => ({
  getKrewpactRoles: vi.fn(),
  getKrewpactOrgId: vi.fn().mockResolvedValue('test-org-00000000-0000-0000-0000-000000000000'),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: vi.fn().mockReturnThis(),
  },
}));

import { auth } from '@clerk/nextjs/server';

import {
  makeRequest,
  mockClerkAuth,
  mockClerkUnauth,
  mockSupabaseClient,
} from '@/__tests__/helpers';
import { GET } from '@/app/api/admin/sync/status/route';
import { getKrewpactRoles } from '@/lib/api/org';
import { createUserClientSafe } from '@/lib/supabase/server';

const mockAuth = vi.mocked(auth);
const mockCreateUserClientSafe = vi.mocked(createUserClientSafe);
const mockGetKrewpactRoles = vi.mocked(getKrewpactRoles);

describe('GET /api/admin/sync/status', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetKrewpactRoles.mockResolvedValue(['platform_admin']);
  });

  it('returns 401 when not authenticated', async () => {
    mockClerkUnauth(mockAuth);

    const res = await GET(makeRequest('/api/admin/sync/status'));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns aggregated stats for all entity types', async () => {
    mockClerkAuth(mockAuth, 'user_123');

    const jobs = [
      { entity_type: 'account', status: 'succeeded', completed_at: '2026-03-08T10:00:00Z' },
      { entity_type: 'account', status: 'succeeded', completed_at: '2026-03-08T09:00:00Z' },
      { entity_type: 'account', status: 'failed', completed_at: '2026-03-08T08:00:00Z' },
      { entity_type: 'contact', status: 'queued', completed_at: null },
      { entity_type: 'payment_entry', status: 'succeeded', completed_at: '2026-03-08T11:00:00Z' },
    ];

    const recentErrors = [
      {
        id: 'err-1',
        job_id: 'job-1',
        error_message: 'Connection timeout',
        error_code: 'SYNC_ERROR',
        created_at: '2026-03-08T08:00:00Z',
      },
    ];

    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: {
          erp_sync_jobs: { data: jobs, error: null },
          erp_sync_errors: { data: recentErrors, error: null },
        },
      }),
      error: null,
    });

    const res = await GET(makeRequest('/api/admin/sync/status'));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.total_jobs).toBe(5);
    expect(body.stats).toHaveLength(13);
    expect(body.recent_errors).toHaveLength(1);

    // Verify account stats
    const accountStats = body.stats.find(
      (s: Record<string, unknown>) => s.entity_type === 'account',
    );
    expect(accountStats.total).toBe(3);
    expect(accountStats.succeeded).toBe(2);
    expect(accountStats.failed).toBe(1);
    expect(accountStats.queued).toBe(0);
    expect(accountStats.last_sync_at).toBe('2026-03-08T10:00:00Z');

    // Verify contact stats
    const contactStats = body.stats.find(
      (s: Record<string, unknown>) => s.entity_type === 'contact',
    );
    expect(contactStats.total).toBe(1);
    expect(contactStats.queued).toBe(1);

    // Verify payment_entry stats
    const paymentStats = body.stats.find(
      (s: Record<string, unknown>) => s.entity_type === 'payment_entry',
    );
    expect(paymentStats.total).toBe(1);
    expect(paymentStats.succeeded).toBe(1);
  });

  it('returns 500 when erp_sync_jobs query fails', async () => {
    mockClerkAuth(mockAuth, 'user_123');

    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: {
          erp_sync_jobs: { data: null, error: { message: 'DB connection lost' } },
        },
      }),
      error: null,
    });

    const res = await GET(makeRequest('/api/admin/sync/status'));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('DB connection lost');
  });

  it('returns empty stats when no jobs exist', async () => {
    mockClerkAuth(mockAuth, 'user_123');

    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: {
          erp_sync_jobs: { data: [], error: null },
          erp_sync_errors: { data: [], error: null },
        },
      }),
      error: null,
    });

    const res = await GET(makeRequest('/api/admin/sync/status'));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.total_jobs).toBe(0);
    expect(body.recent_errors).toEqual([]);

    // All stats should show zero counts
    for (const stat of body.stats) {
      expect(stat.total).toBe(0);
      expect(stat.succeeded).toBe(0);
      expect(stat.failed).toBe(0);
      expect(stat.queued).toBe(0);
      expect(stat.last_sync_at).toBeNull();
    }
  });
});
