import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createUserClientSafe: vi.fn(),
}));

import { auth } from '@clerk/nextjs/server';

import {
  makeLead,
  makeRequest,
  mockClerkAuth,
  mockClerkUnauth,
  mockSupabaseClient,
  resetFixtureCounter,
} from '@/__tests__/helpers';
import { POST } from '@/app/api/crm/leads/[id]/rescore/route';
import { createUserClientSafe } from '@/lib/supabase/server';

const mockAuth = vi.mocked(auth);
const mockCreateUserClientSafe = vi.mocked(createUserClientSafe);

function makeContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe('POST /api/crm/leads/[id]/rescore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFixtureCounter();
  });

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const res = await POST(makeRequest('/api/crm/leads/123/rescore'), makeContext('123'));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 404 for non-existent lead', async () => {
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: {
          leads: { data: null, error: { message: 'Row not found', code: 'PGRST116' } },
        },
      }),
      error: null,
    });

    const res = await POST(makeRequest('/api/crm/leads/nope/rescore'), makeContext('nope'));
    expect(res.status).toBe(404);
  });

  it('recalculates and persists score with matching rules', async () => {
    const lead = makeLead({ source_channel: 'referral', lead_score: 0 });
    const rules = [
      {
        id: 'rule-1',
        name: 'Referral bonus',
        field_name: 'source_channel',
        operator: 'equals',
        value: 'referral',
        score_impact: 25,
        category: 'fit',
        is_active: true,
      },
    ];
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: {
          leads: { data: lead, error: null },
          scoring_rules: { data: rules, error: null },
          lead_score_history: { data: null, error: null },
        },
      }),
      error: null,
    });

    const res = await POST(makeRequest('/api/crm/leads/123/rescore'), makeContext(lead.id));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.score).toBe(25);
    expect(body.previous_score).toBe(0);
    expect(body.rules_evaluated).toBe(1);
    expect(body.rules_matched).toBe(1);
  });

  it('returns zero score when no rules match', async () => {
    const lead = makeLead({ source_channel: 'cold_call', lead_score: 10 });
    const rules = [
      {
        id: 'rule-2',
        name: 'Referral bonus',
        field_name: 'source_channel',
        operator: 'equals',
        value: 'referral',
        score_impact: 25,
        category: 'fit',
        is_active: true,
      },
    ];
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: {
          leads: { data: lead, error: null },
          scoring_rules: { data: rules, error: null },
          lead_score_history: { data: null, error: null },
        },
      }),
      error: null,
    });

    const res = await POST(makeRequest('/api/crm/leads/123/rescore'), makeContext(lead.id));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.score).toBe(0);
    expect(body.previous_score).toBe(10);
    expect(body.rules_matched).toBe(0);
  });

  it('returns zero score when no active rules exist', async () => {
    const lead = makeLead({ lead_score: 50 });
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: {
          leads: { data: lead, error: null },
          scoring_rules: { data: [], error: null },
          lead_score_history: { data: null, error: null },
        },
      }),
      error: null,
    });

    const res = await POST(makeRequest('/api/crm/leads/123/rescore'), makeContext(lead.id));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.score).toBe(0);
    expect(body.rules_evaluated).toBe(0);
  });

  it('returns score fields in response', async () => {
    const lead = makeLead({ lead_score: 0 });
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: {
          leads: { data: lead, error: null },
          scoring_rules: { data: [], error: null },
          lead_score_history: { data: null, error: null },
        },
      }),
      error: null,
    });

    const res = await POST(makeRequest('/api/crm/leads/any/rescore'), makeContext(lead.id));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('score');
    expect(body).toHaveProperty('fit_score');
    expect(body).toHaveProperty('intent_score');
    expect(body).toHaveProperty('engagement_score');
    expect(body).toHaveProperty('previous_score');
    expect(body).toHaveProperty('rules_evaluated');
    expect(body).toHaveProperty('rules_matched');
  });
});
