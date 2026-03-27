import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@clerk/nextjs/server', () => ({ auth: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createUserClientSafe: vi.fn() }));
vi.mock('@/lib/api/rate-limit', () => ({
  rateLimit: vi.fn().mockResolvedValue({ success: true }),
  rateLimitResponse: vi.fn(),
}));
vi.mock('@/lib/logger', () => {
  const m = { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn(), child: vi.fn() };
  m.child.mockReturnValue(m);
  return { logger: m };
});
vi.mock('@/lib/request-context', () => ({
  requestContext: { run: (_: unknown, fn: () => unknown) => fn() },
  generateRequestId: () => 'req_test',
  getRequestContext: () => undefined,
}));

import { auth } from '@clerk/nextjs/server';

import {
  makeAccount,
  makeOpportunity,
  makeRequest,
  mockClerkAuth,
  mockClerkUnauth,
  mockSupabaseClient,
  resetFixtureCounter,
  TEST_IDS,
} from '@/__tests__/helpers';
import { GET } from '@/app/api/crm/accounts/[id]/revenue/route';
import { createUserClientSafe } from '@/lib/supabase/server';

const mockAuth = vi.mocked(auth);
const mockCreateUserClientSafe = vi.mocked(createUserClientSafe);

function makeRevenueRequest(id: string = TEST_IDS.ACCOUNT_ID) {
  return {
    req: makeRequest(`/api/crm/accounts/${id}/revenue`),
    ctx: { params: Promise.resolve({ id }) },
  };
}

describe('GET /api/crm/accounts/[id]/revenue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFixtureCounter();
    mockClerkAuth(mockAuth);
  });

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);

    const { req, ctx } = makeRevenueRequest();
    const res = await GET(req, ctx);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns revenue data for valid account', async () => {
    const account = makeAccount({ id: TEST_IDS.ACCOUNT_ID, account_name: 'MDM Contracting' });
    const opps = [
      makeOpportunity({
        account_id: TEST_IDS.ACCOUNT_ID,
        stage: 'contracted',
        estimated_revenue: 200000,
        created_at: '2026-03-01T00:00:00Z',
        updated_at: '2026-03-15T00:00:00Z',
        opportunity_name: 'Office Reno',
      }),
    ];

    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: {
          accounts: { data: account, error: null },
          opportunities: { data: opps, error: null },
          projects: { data: null, error: null, count: 2 },
        },
      }),
      error: null,
    });

    const { req, ctx } = makeRevenueRequest();
    const res = await GET(req, ctx);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.account_id).toBe(TEST_IDS.ACCOUNT_ID);
    expect(body.account_name).toBe('MDM Contracting');
    expect(body.lifetime_value).toBe(200000);
    expect(body.total_won_deals).toBe(1);
    expect(body.recent_deals).toHaveLength(1);
    expect(body.recent_deals[0].name).toBe('Office Reno');
  });

  it('returns 404 for non-existent account', async () => {
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: {
          accounts: { data: null, error: { message: 'Row not found', code: 'PGRST116' } },
          opportunities: { data: [], error: null },
          projects: { data: null, error: null, count: 0 },
        },
      }),
      error: null,
    });

    const { req, ctx } = makeRevenueRequest('non-existent-id');
    const res = await GET(req, ctx);
    expect(res.status).toBe(404);
  });

  it('calculates lifetime value correctly from multiple deals', async () => {
    const account = makeAccount({ id: TEST_IDS.ACCOUNT_ID });
    const opps = [
      makeOpportunity({
        stage: 'contracted',
        estimated_revenue: 100000,
        created_at: '2026-01-15T00:00:00Z',
      }),
      makeOpportunity({
        stage: 'contracted',
        estimated_revenue: 250000,
        created_at: '2026-06-01T00:00:00Z',
      }),
      makeOpportunity({
        stage: 'contracted',
        estimated_revenue: 75000,
        created_at: '2025-09-01T00:00:00Z',
      }),
    ];

    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: {
          accounts: { data: account, error: null },
          opportunities: { data: opps, error: null },
          projects: { data: null, error: null, count: 0 },
        },
      }),
      error: null,
    });

    const { req, ctx } = makeRevenueRequest();
    const res = await GET(req, ctx);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.lifetime_value).toBe(425000);
    expect(body.total_won_deals).toBe(3);
  });

  it('groups revenue by year', async () => {
    const account = makeAccount({ id: TEST_IDS.ACCOUNT_ID });
    const opps = [
      makeOpportunity({
        stage: 'contracted',
        estimated_revenue: 100000,
        created_at: '2025-03-01T00:00:00Z',
      }),
      makeOpportunity({
        stage: 'contracted',
        estimated_revenue: 200000,
        created_at: '2025-08-01T00:00:00Z',
      }),
      makeOpportunity({
        stage: 'contracted',
        estimated_revenue: 150000,
        created_at: '2026-02-01T00:00:00Z',
      }),
    ];

    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: {
          accounts: { data: account, error: null },
          opportunities: { data: opps, error: null },
          projects: { data: null, error: null, count: 0 },
        },
      }),
      error: null,
    });

    const { req, ctx } = makeRevenueRequest();
    const res = await GET(req, ctx);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.revenue_by_year).toEqual({
      '2025': 300000,
      '2026': 150000,
    });
  });

  it('returns empty data for account with no deals', async () => {
    const account = makeAccount({ id: TEST_IDS.ACCOUNT_ID, account_name: 'New Client' });

    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: {
          accounts: { data: account, error: null },
          opportunities: { data: [], error: null },
          projects: { data: null, error: null, count: 0 },
        },
      }),
      error: null,
    });

    const { req, ctx } = makeRevenueRequest();
    const res = await GET(req, ctx);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.lifetime_value).toBe(0);
    expect(body.total_won_deals).toBe(0);
    expect(body.revenue_by_year).toEqual({});
    expect(body.project_count).toBe(0);
    expect(body.recent_deals).toEqual([]);
  });
});
