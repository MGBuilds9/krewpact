import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockVerifyCronAuth = vi.fn();
vi.mock('@/lib/api/cron-auth', () => ({
  verifyCronAuth: (...args: unknown[]) => mockVerifyCronAuth(...args),
}));

vi.mock('@/lib/api/cron-logger', () => ({
  createCronLogger: vi.fn().mockReturnValue({
    success: vi.fn().mockResolvedValue(undefined),
    failure: vi.fn().mockResolvedValue(undefined),
  }),
}));

vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: vi.fn(),
}));

vi.mock('@/lib/crm/icp-engine', () => ({
  generateICPsFromAccounts: vi.fn(),
  scoreLeadAgainstICP: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import { makeRequest, mockSupabaseClient } from '@/__tests__/helpers';
import { GET } from '@/app/api/cron/icp-refresh/route';
import { generateICPsFromAccounts, scoreLeadAgainstICP } from '@/lib/crm/icp-engine';
import { createServiceClient } from '@/lib/supabase/server';

const mockCreateServiceClient = vi.mocked(createServiceClient);
const mockGenerateICPs = vi.mocked(generateICPsFromAccounts);
const mockScoreLead = vi.mocked(scoreLeadAgainstICP);

function makeCronRequest() {
  return makeRequest('/api/cron/icp-refresh', { method: 'GET' });
}

const TEST_ACCOUNTS = [
  { id: 'acc-1', industry: 'Construction', total_projects: 3, lifetime_revenue: 500000 },
  { id: 'acc-2', industry: 'Construction', total_projects: 5, lifetime_revenue: 900000 },
  { id: 'acc-3', industry: 'Telecom', total_projects: 2, lifetime_revenue: 200000 },
];

const TEST_ICP_PROFILE = {
  name: 'Construction ICP',
  description: 'Auto-generated',
  division_id: null,
  is_auto_generated: true,
  industry_match: ['Construction'],
  geography_match: { cities: [], provinces: ['ON'] },
  project_value_range: { min: 100000, max: 1000000 },
  project_types: [],
  repeat_rate_weight: 0.5,
  sample_size: 2,
  confidence_score: 0.8,
  avg_deal_value: 700000,
  avg_project_duration_days: 90,
  top_sources: ['referral'],
};

describe('GET /api/cron/icp-refresh', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyCronAuth.mockResolvedValue({ authorized: true });
    mockGenerateICPs.mockReturnValue([TEST_ICP_PROFILE]);
    mockScoreLead.mockReturnValue({ score: 75, details: { fit: 75 } });
  });

  it('returns 401 when cron auth fails', async () => {
    mockVerifyCronAuth.mockResolvedValue({ authorized: false });

    const res = await GET(makeCronRequest());
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns success with no accounts when table is empty', async () => {
    mockCreateServiceClient.mockReturnValue(
      mockSupabaseClient({ tables: { accounts: { data: [], error: null } } }) as never,
    );

    const res = await GET(makeCronRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.icps_updated).toBe(0);
    expect(body.message).toMatch(/No accounts/);
  });

  it('returns 500 when accounts query fails', async () => {
    mockCreateServiceClient.mockReturnValue(
      mockSupabaseClient({
        tables: { accounts: { data: null, error: { message: 'DB error' } } },
      }) as never,
    );

    const res = await GET(makeCronRequest());
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('DB error');
  });

  it('returns message when not enough data to generate ICPs', async () => {
    mockCreateServiceClient.mockReturnValue(
      mockSupabaseClient({ tables: { accounts: { data: TEST_ACCOUNTS, error: null } } }) as never,
    );
    mockGenerateICPs.mockReturnValue([]);

    const res = await GET(makeCronRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.icps_updated).toBe(0);
    expect(body.message).toMatch(/Not enough/);
  });

  it('upserts ICP profiles and re-scores leads on happy path', async () => {
    const TEST_LEADS = [
      {
        id: 'lead-1',
        industry: 'Construction',
        city: 'Mississauga',
        province: 'ON',
        source_channel: 'referral',
        enrichment_data: null,
      },
    ];
    const TEST_ICP_ROWS = [
      {
        id: 'icp-1',
        name: 'Construction ICP',
        industry_match: ['Construction'],
        geography_match: { cities: [], provinces: ['ON'] },
        project_value_range: { min: 0, max: 0 },
        project_types: [],
        repeat_rate_weight: 0,
        top_sources: [],
      },
    ];

    let callCount = 0;
    const mockFrom = vi.fn().mockImplementation((table: string) => {
      const baseChain = mockSupabaseClient({}).from(table);
      if (table === 'accounts')
        return mockSupabaseClient({
          tables: { accounts: { data: TEST_ACCOUNTS, error: null } },
        }).from(table);
      if (table === 'ideal_client_profiles') {
        callCount++;
        // maybeSingle for existing check → null (insert path)
        // bulk select of active ICPs
        if (callCount <= 1) {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            is: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            insert: vi.fn().mockResolvedValue({ error: null }),
          };
        }
        return mockSupabaseClient({
          tables: { ideal_client_profiles: { data: TEST_ICP_ROWS, error: null } },
        }).from(table);
      }
      if (table === 'leads')
        return mockSupabaseClient({ tables: { leads: { data: TEST_LEADS, error: null } } }).from(
          table,
        );
      if (table === 'icp_lead_matches') {
        return {
          delete: vi.fn().mockReturnThis(),
          in: vi.fn().mockResolvedValue({ error: null }),
          insert: vi.fn().mockResolvedValue({ error: null }),
        };
      }
      return baseChain;
    });
    mockCreateServiceClient.mockReturnValue({ from: mockFrom } as never);

    const res = await GET(makeCronRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(typeof body.icps_updated).toBe('number');
  });
});
