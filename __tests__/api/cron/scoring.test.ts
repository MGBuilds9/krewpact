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

vi.mock('@/lib/crm/scoring-engine', () => ({
  scoreLead: vi.fn(),
}));

vi.mock('@/lib/integrations/deep-research', () => ({
  deepResearchLead: vi.fn().mockResolvedValue({}),
}));

vi.mock('@/lib/crm/industry-sequence-matcher', () => ({
  matchSequenceToLead: vi.fn().mockResolvedValue(null),
}));

vi.mock('@/lib/crm/constants', () => ({
  INBOUND_SOURCES: ['website', 'referral'],
}));

vi.mock('@/lib/logger', () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import { makeRequest, mockSupabaseClient } from '@/__tests__/helpers';
import { POST } from '@/app/api/cron/scoring/route';
import { scoreLead } from '@/lib/crm/scoring-engine';
import { createServiceClient } from '@/lib/supabase/server';

const mockCreateServiceClient = vi.mocked(createServiceClient);
const mockScoreLead = vi.mocked(scoreLead);

function makeCronRequest(force = false) {
  return makeRequest(`/api/cron/scoring${force ? '?force=true' : ''}`, { method: 'POST' });
}

const TEST_LEADS = [
  {
    id: 'lead-1',
    company_name: 'Acme Construction',
    domain: 'acme.com',
    enrichment_status: 'complete',
    enrichment_data: { revenue: 500000 },
    lead_score: null,
    fit_score: null,
    intent_score: null,
    engagement_score: null,
    source_channel: 'website',
    industry: 'Construction',
    city: 'Mississauga',
    province: 'ON',
    status: 'new',
    division_id: 'div-1',
    current_sequence_id: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const TEST_RULES = [
  {
    id: 'rule-1',
    name: 'Industry match',
    category: 'fit',
    field_name: 'industry',
    operator: 'eq',
    value: 'Construction',
    score_impact: 20,
    is_active: true,
    priority: 1,
    division_id: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

describe('POST /api/cron/scoring', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyCronAuth.mockResolvedValue({ authorized: true });
    mockScoreLead.mockReturnValue({
      total_score: 75,
      fit_score: 50,
      intent_score: 15,
      engagement_score: 10,
      rule_results: [],
    });
  });

  it('returns 401 when cron auth fails', async () => {
    mockVerifyCronAuth.mockResolvedValue({ authorized: false });

    const res = await POST(makeCronRequest());
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns success with zero processed when no leads', async () => {
    mockCreateServiceClient.mockReturnValue(
      mockSupabaseClient({
        tables: {
          leads: { data: [], error: null },
          scoring_rules: { data: TEST_RULES, error: null },
        },
      }) as never,
    );

    const res = await POST(makeCronRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.processed).toBe(0);
    expect(body.message).toMatch(/No leads/);
  });

  it('returns success with zero processed when no active rules', async () => {
    mockCreateServiceClient.mockReturnValue(
      mockSupabaseClient({
        tables: {
          leads: { data: TEST_LEADS, error: null },
          scoring_rules: { data: [], error: null },
        },
      }) as never,
    );

    const res = await POST(makeCronRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.processed).toBe(0);
    expect(body.message).toMatch(/No active scoring rules/);
  });

  it('returns 500 when leads query fails', async () => {
    mockCreateServiceClient.mockReturnValue(
      mockSupabaseClient({
        tables: { leads: { data: null, error: { message: 'leads query error' } } },
      }) as never,
    );

    const res = await POST(makeCronRequest());
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('leads query error');
  });

  it('returns 500 when rules query fails', async () => {
    mockCreateServiceClient.mockReturnValue(
      mockSupabaseClient({
        tables: {
          leads: { data: TEST_LEADS, error: null },
          scoring_rules: { data: null, error: { message: 'rules query error' } },
        },
      }) as never,
    );

    const res = await POST(makeCronRequest());
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe('rules query error');
  });

  it('scores leads and returns processed count on happy path', async () => {
    mockCreateServiceClient.mockReturnValue(
      mockSupabaseClient({
        tables: {
          leads: { data: TEST_LEADS, error: null },
          scoring_rules: { data: TEST_RULES, error: null },
          lead_score_history: { data: null, error: null },
        },
      }) as never,
    );

    const res = await POST(makeCronRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.processed).toBe(1);
    expect(body.errors).toBe(0);
    expect(body.total).toBe(1);
    expect(body.rules_count).toBe(1);
    expect(mockScoreLead).toHaveBeenCalledOnce();
  });

  it('counts errors when scoreLead throws', async () => {
    mockCreateServiceClient.mockReturnValue(
      mockSupabaseClient({
        tables: {
          leads: { data: TEST_LEADS, error: null },
          scoring_rules: { data: TEST_RULES, error: null },
          lead_score_history: { data: null, error: null },
        },
      }) as never,
    );
    mockScoreLead.mockImplementation(() => {
      throw new Error('scoring engine failure');
    });

    const res = await POST(makeCronRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.processed).toBe(0);
    expect(body.errors).toBe(1);
  });
});
