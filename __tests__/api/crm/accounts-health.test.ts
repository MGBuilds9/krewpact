vi.mock('@clerk/nextjs/server', () => ({ auth: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createUserClient: vi.fn() }));
vi.mock('@/lib/api/rate-limit', () => ({
  rateLimit: vi.fn().mockResolvedValue({ success: true }),
  rateLimitResponse: vi.fn(),
}));

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { auth } from '@clerk/nextjs/server';
import { createUserClient } from '@/lib/supabase/server';
import { GET } from '@/app/api/crm/accounts/[id]/health/route';
import {
  mockSupabaseClient,
  mockClerkAuth,
  mockClerkUnauth,
  makeRequest,
  makeAccount,
  makeOpportunity,
  makeActivity,
  resetFixtureCounter,
  TEST_IDS,
} from '@/__tests__/helpers';

const mockAuth = vi.mocked(auth);
const mockCreateUserClient = vi.mocked(createUserClient);

function makeContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe('GET /api/crm/accounts/[id]/health', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFixtureCounter();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-05T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);

    const req = makeRequest('/api/crm/accounts/some-id/health');
    const res = await GET(req, makeContext('some-id'));

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns health data for a valid account', async () => {
    mockClerkAuth(mockAuth);

    const account = makeAccount({ id: TEST_IDS.ACCOUNT_ID, account_name: 'Acme Corp' });
    const opps = [
      makeOpportunity({ stage: 'contracted', estimated_revenue: 200_000, account_id: TEST_IDS.ACCOUNT_ID }),
      makeOpportunity({ stage: 'intake', estimated_revenue: 50_000, account_id: TEST_IDS.ACCOUNT_ID }),
    ];
    const activity = makeActivity({ account_id: TEST_IDS.ACCOUNT_ID, created_at: '2026-03-04T10:00:00Z' });

    const supabase = mockSupabaseClient({
      tables: {
        accounts: { data: account, error: null },
        opportunities: { data: opps, error: null },
        activities: { data: [activity], error: null },
      },
    });
    mockCreateUserClient.mockResolvedValue(supabase);

    const req = makeRequest('/api/crm/accounts/' + TEST_IDS.ACCOUNT_ID + '/health');
    const res = await GET(req, makeContext(TEST_IDS.ACCOUNT_ID));

    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.account_id).toBe(TEST_IDS.ACCOUNT_ID);
    expect(body.account_name).toBe('Acme Corp');
    expect(body.health).toBeDefined();
    expect(body.health.score).toBeGreaterThanOrEqual(0);
    expect(body.health.score).toBeLessThanOrEqual(100);
    expect(body.health.grade).toBeDefined();
    expect(body.health.factors).toBeDefined();
    expect(body.lifecycle_stage).toBeDefined();
    expect(body.stats).toBeDefined();
    expect(body.stats.total_opportunities).toBe(2);
    expect(body.stats.won_opportunities).toBe(1);
    expect(body.stats.active_opportunities).toBe(1); // intake is active
    expect(body.stats.total_revenue).toBe(200_000);
    expect(body.stats.last_activity_at).toBe('2026-03-04T10:00:00Z');
  });

  it('returns 404 for non-existent account', async () => {
    mockClerkAuth(mockAuth);

    const supabase = mockSupabaseClient({
      tables: {
        accounts: { data: null, error: { code: 'PGRST116', message: 'Not found' } },
        opportunities: { data: [], error: null },
        activities: { data: [], error: null },
      },
    });
    mockCreateUserClient.mockResolvedValue(supabase);

    const req = makeRequest('/api/crm/accounts/nonexistent-id/health');
    const res = await GET(req, makeContext('nonexistent-id'));

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe('Not found');
  });

  it('returns correct lifecycle_stage for repeat client', async () => {
    mockClerkAuth(mockAuth);

    const account = makeAccount({ id: TEST_IDS.ACCOUNT_ID, account_name: 'Repeat Client Co' });
    const opps = [
      makeOpportunity({ stage: 'contracted', estimated_revenue: 100_000, account_id: TEST_IDS.ACCOUNT_ID }),
      makeOpportunity({ stage: 'contracted', estimated_revenue: 150_000, account_id: TEST_IDS.ACCOUNT_ID }),
      makeOpportunity({ stage: 'intake', estimated_revenue: 75_000, account_id: TEST_IDS.ACCOUNT_ID }),
    ];
    const activity = makeActivity({ account_id: TEST_IDS.ACCOUNT_ID, created_at: '2026-03-04T08:00:00Z' });

    const supabase = mockSupabaseClient({
      tables: {
        accounts: { data: account, error: null },
        opportunities: { data: opps, error: null },
        activities: { data: [activity], error: null },
      },
    });
    mockCreateUserClient.mockResolvedValue(supabase);

    const req = makeRequest('/api/crm/accounts/' + TEST_IDS.ACCOUNT_ID + '/health');
    const res = await GET(req, makeContext(TEST_IDS.ACCOUNT_ID));

    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.lifecycle_stage).toBe('repeat_client');
    expect(body.stats.won_opportunities).toBe(2);
    expect(body.stats.active_opportunities).toBe(1);
    expect(body.stats.total_revenue).toBe(250_000);
  });

  it('handles no opportunities gracefully', async () => {
    mockClerkAuth(mockAuth);

    const account = makeAccount({ id: TEST_IDS.ACCOUNT_ID, account_name: 'New Lead Inc' });

    const supabase = mockSupabaseClient({
      tables: {
        accounts: { data: account, error: null },
        opportunities: { data: [], error: null },
        activities: { data: [], error: null },
      },
    });
    mockCreateUserClient.mockResolvedValue(supabase);

    const req = makeRequest('/api/crm/accounts/' + TEST_IDS.ACCOUNT_ID + '/health');
    const res = await GET(req, makeContext(TEST_IDS.ACCOUNT_ID));

    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.lifecycle_stage).toBe('lead');
    expect(body.health.grade).toBe('inactive');
    expect(body.health.score).toBe(0);
    expect(body.stats.total_opportunities).toBe(0);
    expect(body.stats.won_opportunities).toBe(0);
    expect(body.stats.active_opportunities).toBe(0);
    expect(body.stats.total_revenue).toBe(0);
    expect(body.stats.last_activity_at).toBeNull();
  });
});
