import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Clerk auth
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}));

// Mock Supabase server client
vi.mock('@/lib/supabase/server', () => ({
  createUserClientSafe: vi.fn(),
}));

import { auth } from '@clerk/nextjs/server';
import { createUserClientSafe } from '@/lib/supabase/server';
import { GET, POST } from '@/app/api/crm/leads/[id]/score/route';
import {
  mockSupabaseClient,
  mockClerkAuth,
  mockClerkUnauth,
  makeRequest,
  makeLead,
  resetFixtureCounter,
} from '@/__tests__/helpers';

const mockAuth = vi.mocked(auth);
const mockCreateUserClientSafe = vi.mocked(createUserClientSafe);

function makeContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

// ============================================================
// GET /api/crm/leads/[id]/score
// ============================================================
describe('GET /api/crm/leads/[id]/score', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFixtureCounter();
  });

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const res = await GET(makeRequest('/api/crm/leads/123/score'), makeContext('123'));
    expect(res.status).toBe(401);
  });

  it('returns score and history for a lead', async () => {
    const lead = makeLead({
      lead_score: 75,
      fit_score: 30,
      intent_score: 25,
      engagement_score: 20,
    });
    const history = [
      {
        id: 'h1',
        lead_id: lead.id,
        lead_score: 75,
        fit_score: 30,
        intent_score: 25,
        engagement_score: 20,
        triggered_by: 'manual',
        recorded_at: '2026-02-24T00:00:00Z',
      },
    ];
    mockClerkAuth(mockAuth);
    mockCreateUserClientSafe.mockResolvedValue({
      client: mockSupabaseClient({
        tables: {
          leads: { data: lead, error: null },
          lead_score_history: { data: history, error: null },
        },
      }),
      error: null,
    });

    const res = await GET(makeRequest('/api/crm/leads/123/score'), makeContext(lead.id));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.score).toBe(75);
    expect(body.history).toEqual(history);
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

    const res = await GET(makeRequest('/api/crm/leads/nope/score'), makeContext('nope'));
    expect(res.status).toBe(404);
  });
});

// ============================================================
// POST /api/crm/leads/[id]/score
// ============================================================
describe('POST /api/crm/leads/[id]/score', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFixtureCounter();
  });

  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);
    const res = await POST(makeRequest('/api/crm/leads/123/score'), makeContext('123'));
    expect(res.status).toBe(401);
  });

  it('recalculates score with matching rules', async () => {
    const lead = makeLead({ source: 'referral', lead_score: 0 });
    const rules = [
      {
        id: 'rule-1',
        name: 'Referral bonus',
        field_name: 'source',
        operator: 'equals',
        value: 'referral',
        score_impact: 20,
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

    const res = await POST(makeRequest('/api/crm/leads/123/score'), makeContext(lead.id));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.score).toBe(20);
    expect(body.rules_evaluated).toBe(1);
    expect(body.rules_matched).toBe(1);
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

    const res = await POST(makeRequest('/api/crm/leads/nope/score'), makeContext('nope'));
    expect(res.status).toBe(404);
  });

  it('returns zero score when no rules match', async () => {
    const lead = makeLead({ source: 'website', lead_score: 0 });
    const rules = [
      {
        id: 'rule-1',
        name: 'Referral bonus',
        field_name: 'source',
        operator: 'equals',
        value: 'referral',
        score_impact: 20,
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

    const res = await POST(makeRequest('/api/crm/leads/123/score'), makeContext(lead.id));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.score).toBe(0);
    expect(body.rules_matched).toBe(0);
  });
});
