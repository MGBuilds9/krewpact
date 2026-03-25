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

vi.mock('@/lib/notifications/dispatcher', () => ({
  dispatchNotification: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/crm/scoring-engine', () => ({
  scoreLead: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import { auth } from '@clerk/nextjs/server';

import { makeJsonRequest, makeLead, mockClerkAuth, mockClerkUnauth, mockSupabaseClient } from '@/__tests__/helpers';
import { PATCH } from '@/app/api/crm/leads/[id]/route';
import { scoreLead } from '@/lib/crm/scoring-engine';
import { createUserClientSafe } from '@/lib/supabase/server';

const mockAuth = vi.mocked(auth);
const mockCreateUserClientSafe = vi.mocked(createUserClientSafe);
const mockScoreLead = vi.mocked(scoreLead);

function makeContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe('PATCH /api/crm/leads/[id] — rescore on update', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const res = await PATCH(
      makeJsonRequest('/api/crm/leads/123', { company_name: 'Test' }, 'PATCH'),
      makeContext('123'),
    );
    expect(res.status).toBe(401);
  });

  it('calls scoreLead after successful update when rules exist', async () => {
    const updated = makeLead({ company_name: 'Updated Lead', lead_score: 0 });
    const rules = [
      {
        id: 'rule-1',
        name: 'Has Industry',
        category: 'fit',
        field_name: 'industry',
        operator: 'exists',
        value: '',
        score_impact: 20,
        is_active: true,
        priority: 1,
        division_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    mockScoreLead.mockReturnValue({
      total_score: 20,
      fit_score: 20,
      intent_score: 0,
      engagement_score: 0,
      rule_results: [],
    });

    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: {
          leads: { data: updated, error: null },
          scoring_rules: { data: rules, error: null },
          lead_score_history: { data: null, error: null },
        },
      }),
      error: null,
    });

    const res = await PATCH(
      makeJsonRequest('/api/crm/leads/123', { company_name: 'Updated Lead' }, 'PATCH'),
      makeContext(updated.id),
    );
    expect(res.status).toBe(200);
    expect(mockScoreLead).toHaveBeenCalledTimes(1);
    expect(mockScoreLead).toHaveBeenCalledWith(
      expect.objectContaining({ company_name: 'Updated Lead' }),
      rules,
    );
  });

  it('returns updated lead with refreshed lead_score', async () => {
    const updated = makeLead({ lead_score: 0 });
    const rules = [
      {
        id: 'rule-1',
        name: 'Province Ontario',
        category: 'fit',
        field_name: 'province',
        operator: 'equals',
        value: 'ON',
        score_impact: 15,
        is_active: true,
        priority: 1,
        division_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    mockScoreLead.mockReturnValue({
      total_score: 15,
      fit_score: 15,
      intent_score: 0,
      engagement_score: 0,
      rule_results: [],
    });

    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: {
          leads: { data: updated, error: null },
          scoring_rules: { data: rules, error: null },
          lead_score_history: { data: null, error: null },
        },
      }),
      error: null,
    });

    const res = await PATCH(
      makeJsonRequest('/api/crm/leads/123', { province: 'ON' }, 'PATCH'),
      makeContext(updated.id),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    // lead_score is updated in-place on the returned data object
    expect(body.lead_score).toBe(15);
  });

  it('does not call scoreLead when no active rules exist', async () => {
    const updated = makeLead();
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: {
          leads: { data: updated, error: null },
          scoring_rules: { data: [], error: null },
        },
      }),
      error: null,
    });

    const res = await PATCH(
      makeJsonRequest('/api/crm/leads/123', { company_name: 'New Name' }, 'PATCH'),
      makeContext(updated.id),
    );
    expect(res.status).toBe(200);
    expect(mockScoreLead).not.toHaveBeenCalled();
  });

  it('still returns 200 when scoring throws (non-blocking)', async () => {
    const updated = makeLead();
    const rules = [
      {
        id: 'rule-1',
        name: 'Failing Rule',
        category: 'fit',
        field_name: 'industry',
        operator: 'exists',
        value: '',
        score_impact: 10,
        is_active: true,
        priority: 1,
        division_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    mockScoreLead.mockImplementation(() => {
      throw new Error('Scoring engine failure');
    });

    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: {
          leads: { data: updated, error: null },
          scoring_rules: { data: rules, error: null },
        },
      }),
      error: null,
    });

    const res = await PATCH(
      makeJsonRequest('/api/crm/leads/123', { industry: 'Construction' }, 'PATCH'),
      makeContext(updated.id),
    );
    // Scoring failure must NOT block the update response
    expect(res.status).toBe(200);
  });

  it('returns 404 when lead does not exist', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: {
          leads: { data: null, error: { message: 'Row not found', code: 'PGRST116' } },
        },
      }),
      error: null,
    });

    const res = await PATCH(
      makeJsonRequest('/api/crm/leads/ghost', { company_name: 'Ghost' }, 'PATCH'),
      makeContext('ghost'),
    );
    expect(res.status).toBe(404);
  });

  it('returns 400 for invalid patch body (company_name too short after trim)', async () => {
    mockClerkAuth(mockAuth);
    // company_name is validated with min(1) — empty string after trim fails
    const res = await PATCH(
      makeJsonRequest('/api/crm/leads/123', { company_name: '' }, 'PATCH'),
      makeContext('123'),
    );
    expect(res.status).toBe(400);
  });
});
