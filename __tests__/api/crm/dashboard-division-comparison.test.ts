import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@clerk/nextjs/server', () => ({ auth: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createUserClientSafe: vi.fn() }));
vi.mock('@/lib/api/rate-limit', () => ({
  rateLimit: vi.fn().mockResolvedValue({ success: true }),
  rateLimitResponse: vi.fn(),
}));
vi.mock('@/lib/request-context', () => ({
  requestContext: { run: vi.fn((_ctx, fn) => fn()) },
  generateRequestId: vi.fn().mockReturnValue('req_test'),
}));
vi.mock('@/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    child: vi.fn().mockReturnThis(),
  },
}));

import { auth } from '@clerk/nextjs/server';

import { GET } from '@/app/api/crm/dashboard/division-comparison/route';
import { createUserClientSafe } from '@/lib/supabase/server';

import { makeRequest, mockClerkAuth, mockClerkUnauth, mockSupabaseClient } from '../../helpers';

const mockAuth = vi.mocked(auth);
const mockCreateUserClientSafe = vi.mocked(createUserClientSafe);

function makeGetRequest() {
  return makeRequest('/api/crm/dashboard/division-comparison');
}

describe('GET /api/crm/dashboard/division-comparison', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockClerkAuth(mockAuth);
  });

  it('returns 401 if not authenticated', async () => {
    mockClerkUnauth(mockAuth);

    const res = await GET(makeGetRequest());
    expect(res.status).toBe(401);

    const body = await res.json();
    expect(body.error).toBeDefined();
  });

  it('returns division_comparison and seasonal_analysis', async () => {
    const opps = [
      {
        id: '1',
        division_id: 'contracting',
        stage: 'contracted',
        estimated_revenue: 200000,
        created_at: '2026-01-15T00:00:00Z',
        updated_at: '2026-02-01T00:00:00Z',
      },
      {
        id: '2',
        division_id: 'contracting',
        stage: 'closed_lost',
        estimated_revenue: 50000,
        created_at: '2026-02-10T00:00:00Z',
        updated_at: '2026-03-01T00:00:00Z',
      },
      {
        id: '3',
        division_id: 'homes',
        stage: 'contracted',
        estimated_revenue: 750000,
        created_at: '2026-07-20T00:00:00Z',
        updated_at: '2026-08-01T00:00:00Z',
      },
    ];

    const client = mockSupabaseClient({
      tables: {
        opportunities: { data: opps, error: null },
      },
    });
    mockCreateUserClientSafe.mockResolvedValue({ client: client as never, error: null });

    const res = await GET(makeGetRequest());
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.division_comparison).toBeDefined();
    expect(body.seasonal_analysis).toBeDefined();
    expect(Array.isArray(body.division_comparison)).toBe(true);
    expect(Array.isArray(body.seasonal_analysis)).toBe(true);
    expect(body.division_comparison).toHaveLength(2);
  });

  it('returns empty arrays when no opportunities exist', async () => {
    const client = mockSupabaseClient({
      tables: {
        opportunities: { data: [], error: null },
      },
    });
    mockCreateUserClientSafe.mockResolvedValue({ client: client as never, error: null });

    const res = await GET(makeGetRequest());
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.division_comparison).toEqual([]);
    expect(body.seasonal_analysis).toEqual([]);
  });

  it('returns 500 on database error', async () => {
    const client = mockSupabaseClient({
      tables: {
        opportunities: { data: null, error: { message: 'connection refused' } },
      },
    });
    mockCreateUserClientSafe.mockResolvedValue({ client: client as never, error: null });

    const res = await GET(makeGetRequest());
    expect(res.status).toBe(500);

    const body = await res.json();
    expect(body.error).toBeDefined();
  });

  it('calculates correct aggregate values', async () => {
    const opps = [
      {
        id: '1',
        division_id: 'contracting',
        stage: 'contracted',
        estimated_revenue: 300000,
        created_at: '2026-01-10T00:00:00Z',
        updated_at: '2026-01-20T00:00:00Z',
      },
      {
        id: '2',
        division_id: 'contracting',
        stage: 'contracted',
        estimated_revenue: 200000,
        created_at: '2026-03-15T00:00:00Z',
        updated_at: '2026-03-20T00:00:00Z',
      },
      {
        id: '3',
        division_id: 'contracting',
        stage: 'closed_lost',
        estimated_revenue: 100000,
        created_at: '2026-02-01T00:00:00Z',
        updated_at: '2026-02-15T00:00:00Z',
      },
    ];

    const client = mockSupabaseClient({
      tables: {
        opportunities: { data: opps, error: null },
      },
    });
    mockCreateUserClientSafe.mockResolvedValue({ client: client as never, error: null });

    const res = await GET(makeGetRequest());
    const body = await res.json();

    const contracting = body.division_comparison[0];
    expect(contracting.division_id).toBe('contracting');
    expect(contracting.total_opportunities).toBe(3);
    expect(contracting.won_count).toBe(2);
    expect(contracting.lost_count).toBe(1);
    expect(contracting.won_revenue).toBe(500000);
    // win_rate = 2 / (2 + 1) * 100 = 67
    expect(contracting.win_rate).toBe(67);
    // avg_deal_size = 600000 / 3 = 200000
    expect(contracting.avg_deal_size).toBe(200000);

    // All in Q1 2026
    expect(body.seasonal_analysis).toHaveLength(1);
    expect(body.seasonal_analysis[0].quarter).toBe('2026-Q1');
    expect(body.seasonal_analysis[0].created).toBe(3);
    expect(body.seasonal_analysis[0].revenue).toBe(600000);
  });
});
