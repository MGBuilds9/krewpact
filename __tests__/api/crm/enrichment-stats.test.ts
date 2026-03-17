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

import { auth } from '@clerk/nextjs/server';

import { makeRequest } from '@/__tests__/helpers';
import { GET } from '@/app/api/crm/enrichment/stats/route';
import { createUserClientSafe } from '@/lib/supabase/server';

const mockAuth = vi.mocked(auth);
const mockCreateUserClientSafe = vi.mocked(createUserClientSafe);

function makeStatsClient(
  counts: { total: number; pending: number; completed: number; failed: number },
  lastUpdatedAt: string | null = '2026-03-06T12:00:00Z',
) {
  // The stats route calls supabase.from() 5 times via Promise.all
  // Each call returns a chainable mock
  let callCount = 0;
  const responses = [
    { data: null, error: null, count: counts.total }, // total
    { data: null, error: null, count: counts.pending }, // pending
    { data: null, error: null, count: counts.completed }, // completed
    { data: null, error: null, count: counts.failed }, // failed
    { data: lastUpdatedAt ? [{ updated_at: lastUpdatedAt }] : [], error: null, count: null }, // lastRun
  ];

  function createChain(responseIdx: number) {
    const resp = responses[responseIdx] ?? { data: [], error: null, count: null };
    const chain: Record<string, unknown> = {};
    [
      'select',
      'eq',
      'neq',
      'order',
      'limit',
      'range',
      'ilike',
      'in',
      'gte',
      'lte',
      'gt',
      'lt',
    ].forEach((m) => {
      chain[m] = vi.fn().mockReturnValue(chain);
    });
    chain.single = vi.fn().mockResolvedValue(resp);
    chain.maybeSingle = vi.fn().mockResolvedValue(resp);
    chain.then = (resolve: (v: unknown) => void) => resolve(resp);
    return chain;
  }

  const client = {
    from: vi.fn().mockImplementation(() => {
      const idx = callCount;
      callCount++;
      return createChain(idx);
    }),
  };

  mockCreateUserClientSafe.mockResolvedValue({ client: client as never, error: null });
  return client;
}

describe('GET /api/crm/enrichment/stats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ userId: 'user-1' } as never);
  });

  it('returns 401 without auth', async () => {
    mockAuth.mockResolvedValue({ userId: null } as never);
    const req = makeRequest('/api/crm/enrichment/stats');
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it('returns correct stats shape', async () => {
    makeStatsClient({ total: 100, pending: 10, completed: 80, failed: 10 });
    const req = makeRequest('/api/crm/enrichment/stats');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({
      total: 100,
      pending: 10,
      completed: 80,
      failed: 10,
      lastRunAt: '2026-03-06T12:00:00Z',
    });
  });

  it('returns null lastRunAt when no jobs exist', async () => {
    makeStatsClient({ total: 0, pending: 0, completed: 0, failed: 0 }, null);
    const req = makeRequest('/api/crm/enrichment/stats');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.lastRunAt).toBeNull();
    expect(body.total).toBe(0);
  });

  it('returns 500 on supabase error', async () => {
    const errorResp = { data: null, error: { message: 'DB error' }, count: null };
    function createErrorChain() {
      const chain: Record<string, unknown> = {};
      ['select', 'eq', 'neq', 'order', 'limit', 'range', 'ilike', 'in', 'gte', 'lte'].forEach(
        (m) => {
          chain[m] = vi.fn().mockReturnValue(chain);
        },
      );
      chain.single = vi.fn().mockResolvedValue(errorResp);
      chain.maybeSingle = vi.fn().mockResolvedValue(errorResp);
      chain.then = (resolve: (v: unknown) => void) => resolve(errorResp);
      return chain;
    }

    const client = {
      from: vi.fn().mockImplementation(() => {
        return createErrorChain();
      }),
    };
    mockCreateUserClientSafe.mockResolvedValue({ client: client as never, error: null });

    const req = makeRequest('/api/crm/enrichment/stats');
    const res = await GET(req);
    expect(res.status).toBe(500);
  });

  it('handles zero counts gracefully', async () => {
    makeStatsClient({ total: 0, pending: 0, completed: 0, failed: 0 });
    const req = makeRequest('/api/crm/enrichment/stats');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.total).toBe(0);
    expect(body.pending).toBe(0);
    expect(body.completed).toBe(0);
    expect(body.failed).toBe(0);
  });
});
