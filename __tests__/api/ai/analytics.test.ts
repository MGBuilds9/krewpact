import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@clerk/nextjs/server', () => ({ auth: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({
  createUserClientSafe: vi.fn(),
}));
vi.mock('@/lib/api/rate-limit', () => ({
  rateLimit: vi.fn().mockResolvedValue({ success: true }),
  rateLimitResponse: vi.fn(),
}));

import { auth } from '@clerk/nextjs/server';

import { GET } from '@/app/api/ai/analytics/route';
import { rateLimit } from '@/lib/api/rate-limit';
import { createUserClientSafe } from '@/lib/supabase/server';

import { makeRequest } from '../../helpers/mock-request';

function mockAnalyticsClient(opts: {
  totalGenerated?: number;
  totalDismissed?: number;
  totalActedOn?: number;
  allInsights?: any[];
  costData?: any[];
}) {
  let callIndex = 0;
  const fromFn = vi.fn().mockImplementation((table: string) => {
    const chain: any = {};
    ['select', 'eq', 'not', 'limit'].forEach((m) => {
      chain[m] = vi.fn().mockReturnValue(chain);
    });

    if (table === 'ai_insights') {
      callIndex++;
      if (callIndex === 1) {
        chain.then = (resolve: any) =>
          resolve({ count: opts.totalGenerated ?? 0, data: null, error: null });
      } else if (callIndex === 2) {
        chain.then = (resolve: any) =>
          resolve({ count: opts.totalDismissed ?? 0, data: null, error: null });
      } else if (callIndex === 3) {
        chain.then = (resolve: any) =>
          resolve({ count: opts.totalActedOn ?? 0, data: null, error: null });
      } else {
        chain.then = (resolve: any) => resolve({ data: opts.allInsights ?? [], error: null });
      }
    } else if (table === 'ai_actions') {
      chain.then = (resolve: any) => resolve({ data: opts.costData ?? [], error: null });
    }

    return chain;
  });

  return { client: { from: fromFn }, error: null };
}

describe('GET /api/ai/analytics', () => {
  const mockAuth = vi.mocked(auth);
  const mockCreateUserClientSafe = vi.mocked(createUserClientSafe);
  const mockRateLimit = vi.mocked(rateLimit);

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ userId: 'user-1' } as any);
    mockRateLimit.mockResolvedValue({ success: true } as any);
  });

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue({ userId: null } as any);
    const req = makeRequest('/api/ai/analytics');
    const res = await GET(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns analytics with all zeros when no insights', async () => {
    (mockCreateUserClientSafe as any).mockResolvedValue(mockAnalyticsClient({}));
    const req = makeRequest('/api/ai/analytics');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.analytics.total_generated).toBe(0);
    expect(body.analytics.total_dismissed).toBe(0);
    expect(body.analytics.total_acted_on).toBe(0);
    expect(body.analytics.dismiss_rate).toBe(0);
    expect(body.analytics.action_rate).toBe(0);
    expect(body.analytics.total_ai_cost_cents).toBe(0);
  });

  it('calculates dismiss_rate and action_rate correctly', async () => {
    (mockCreateUserClientSafe as any).mockResolvedValue(
      mockAnalyticsClient({
        totalGenerated: 10,
        totalDismissed: 3,
        totalActedOn: 5,
        allInsights: [],
        costData: [],
      }),
    );
    const req = makeRequest('/api/ai/analytics');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.analytics.dismiss_rate).toBe(30);
    expect(body.analytics.action_rate).toBe(50);
  });

  it('groups insights by type', async () => {
    const sampleInsights = [
      { insight_type: 'stale_deal', dismissed_at: null, acted_on_at: '2026-03-12T10:00:00Z' },
      { insight_type: 'stale_deal', dismissed_at: '2026-03-12T11:00:00Z', acted_on_at: null },
      { insight_type: 'bid_match', dismissed_at: null, acted_on_at: null },
    ];
    (mockCreateUserClientSafe as any).mockResolvedValue(
      mockAnalyticsClient({
        totalGenerated: 3,
        totalDismissed: 1,
        totalActedOn: 1,
        allInsights: sampleInsights,
        costData: [],
      }),
    );
    const req = makeRequest('/api/ai/analytics');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.analytics.by_type.stale_deal).toMatchObject({
      total: 2,
      dismissed: 1,
      acted_on: 1,
    });
    expect(body.analytics.by_type.bid_match).toMatchObject({ total: 1, dismissed: 0, acted_on: 0 });
  });

  it('sums ai_actions cost_cents', async () => {
    const sampleCosts = [{ cost_cents: 5 }, { cost_cents: 10 }, { cost_cents: 15 }];
    (mockCreateUserClientSafe as any).mockResolvedValue(
      mockAnalyticsClient({ allInsights: [], costData: sampleCosts }),
    );
    const req = makeRequest('/api/ai/analytics');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.analytics.total_ai_cost_cents).toBe(30);
  });

  it('handles null cost_cents gracefully', async () => {
    const sampleCosts = [{ cost_cents: 5 }, { cost_cents: 10 }, { cost_cents: null }];
    (mockCreateUserClientSafe as any).mockResolvedValue(
      mockAnalyticsClient({ allInsights: [], costData: sampleCosts }),
    );
    const req = makeRequest('/api/ai/analytics');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.analytics.total_ai_cost_cents).toBe(15);
  });
});
