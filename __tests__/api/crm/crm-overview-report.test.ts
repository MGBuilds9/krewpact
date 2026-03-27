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

import {
  makeLead,
  makeOpportunity,
  makeRequest,
  mockClerkAuth,
  mockClerkUnauth,
} from '@/__tests__/helpers';
import { GET } from '@/app/api/crm/reports/overview/route';
import { createUserClientSafe } from '@/lib/supabase/server';

const mockAuth = vi.mocked(auth);
const mockCreateUserClientSafe = vi.mocked(createUserClientSafe);

function mockSupabase(
  tables: Record<string, { data: unknown; error: unknown; count?: number | null }>,
) {
  const makeChain = (resp: { data: unknown; error: unknown; count?: number | null }) => {
    const chain: Record<string, unknown> = {};
    const methods = ['select', 'eq', 'neq', 'ilike', 'gte', 'lte', 'order', 'range', 'limit', 'in'];
    for (const m of methods) {
      chain[m] = vi.fn().mockReturnValue(chain);
    }
    chain.single = vi.fn().mockResolvedValue(resp);
    chain.then = (resolve: (v: unknown) => void) => resolve({ ...resp, count: resp.count ?? null });
    return chain;
  };

  const client = {
    from: vi.fn().mockImplementation((table: string) => {
      return makeChain(tables[table] ?? { data: [], error: null, count: 0 });
    }),
  };
  mockCreateUserClientSafe.mockResolvedValue({ client: client as never, error: null });
  return client;
}

describe('GET /api/crm/reports/overview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockClerkAuth(mockAuth);
  });

  it('returns 401 when unauthenticated', async () => {
    mockClerkUnauth(mockAuth);
    const res = await GET(makeRequest('/api/crm/reports/overview'));
    expect(res.status).toBe(401);
  });

  it('returns overview data with empty tables', async () => {
    mockSupabase({
      leads: { data: [], error: null, count: 0 },
      contacts: { data: [], error: null, count: 0 },
      accounts: { data: [], error: null, count: 0 },
      opportunities: { data: [], error: null, count: 0 },
      activities: { data: [], error: null, count: 0 },
      bidding_opportunities: { data: [], error: null, count: 0 },
    });

    const res = await GET(makeRequest('/api/crm/reports/overview'));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.summary.totalLeads).toBe(0);
    expect(json.summary.conversionRate).toBe(0);
  });

  it('calculates lead funnel correctly', async () => {
    const leads = [
      makeLead({ status: 'new' }),
      makeLead({ status: 'new' }),
      makeLead({ status: 'qualified' }),
      makeLead({ status: 'won' }),
    ];
    mockSupabase({
      leads: { data: leads, error: null, count: 4 },
      contacts: { data: [], error: null, count: 5 },
      accounts: { data: [], error: null, count: 3 },
      opportunities: { data: [], error: null, count: 0 },
      activities: { data: [], error: null, count: 0 },
      bidding_opportunities: { data: [], error: null, count: 0 },
    });

    const res = await GET(makeRequest('/api/crm/reports/overview'));
    const json = await res.json();
    expect(json.leadFunnel.new).toBe(2);
    expect(json.leadFunnel.qualified).toBe(1);
    expect(json.leadFunnel.won).toBe(1);
    expect(json.summary.conversionRate).toBe(25);
  });

  it('calculates pipeline revenue correctly', async () => {
    const opportunities = [
      makeOpportunity({ stage: 'estimating', estimated_revenue: 100000 }),
      makeOpportunity({ stage: 'estimating', estimated_revenue: 200000 }),
      makeOpportunity({ stage: 'proposal', estimated_revenue: 50000 }),
    ];
    mockSupabase({
      leads: { data: [], error: null, count: 0 },
      contacts: { data: [], error: null, count: 0 },
      accounts: { data: [], error: null, count: 0 },
      opportunities: { data: opportunities, error: null, count: 3 },
      activities: { data: [], error: null, count: 0 },
      bidding_opportunities: { data: [], error: null, count: 0 },
    });

    const res = await GET(makeRequest('/api/crm/reports/overview'));
    const json = await res.json();
    expect(json.summary.totalPipelineRevenue).toBe(350000);
    expect(json.pipeline.estimating.count).toBe(2);
    expect(json.pipeline.estimating.revenue).toBe(300000);
  });

  it('counts activities by type', async () => {
    const activities = [
      { id: '1', activity_type: 'call', created_at: new Date().toISOString() },
      { id: '2', activity_type: 'call', created_at: new Date().toISOString() },
      { id: '3', activity_type: 'email', created_at: new Date().toISOString() },
    ];
    mockSupabase({
      leads: { data: [], error: null, count: 0 },
      contacts: { data: [], error: null, count: 0 },
      accounts: { data: [], error: null, count: 0 },
      opportunities: { data: [], error: null, count: 0 },
      activities: { data: activities, error: null, count: 3 },
      bidding_opportunities: { data: [], error: null, count: 0 },
    });

    const res = await GET(makeRequest('/api/crm/reports/overview'));
    const json = await res.json();
    expect(json.activityVolume.call).toBe(2);
    expect(json.activityVolume.email).toBe(1);
  });

  it('includes bidding summary', async () => {
    const bids = [
      { id: '1', status: 'new', estimated_value: 100000 },
      { id: '2', status: 'submitted', estimated_value: 250000 },
    ];
    mockSupabase({
      leads: { data: [], error: null, count: 0 },
      contacts: { data: [], error: null, count: 0 },
      accounts: { data: [], error: null, count: 0 },
      opportunities: { data: [], error: null, count: 0 },
      activities: { data: [], error: null, count: 0 },
      bidding_opportunities: { data: bids, error: null, count: 2 },
    });

    const res = await GET(makeRequest('/api/crm/reports/overview'));
    const json = await res.json();
    expect(json.bidding.new).toBe(1);
    expect(json.bidding.submitted).toBe(1);
    expect(json.summary.totalBidValue).toBe(350000);
  });
});
