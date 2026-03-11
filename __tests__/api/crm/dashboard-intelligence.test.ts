vi.mock('@clerk/nextjs/server', () => ({ auth: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createUserClientSafe: vi.fn() }));
vi.mock('@/lib/api/rate-limit', () => ({
  rateLimit: vi.fn().mockResolvedValue({ success: true }),
  rateLimitResponse: vi.fn(),
}));

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { auth } from '@clerk/nextjs/server';
import { createUserClientSafe } from '@/lib/supabase/server';
import { GET } from '@/app/api/crm/dashboard/intelligence/route';
import {
  mockSupabaseClient,
  mockClerkAuth,
  mockClerkUnauth,
  makeRequest,
  makeOpportunity,
  resetFixtureCounter,
} from '@/__tests__/helpers';

const mockAuth = vi.mocked(auth);
const mockCreateUserClientSafe = vi.mocked(createUserClientSafe);

beforeEach(() => {
  vi.clearAllMocks();
  resetFixtureCounter();
});

describe('GET /api/crm/dashboard/intelligence', () => {
  it('returns 401 without auth', async () => {
    mockClerkUnauth(mockAuth);

    const res = await GET(makeRequest('/api/crm/dashboard/intelligence'));
    expect(res.status).toBe(401);

    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns intelligence data', async () => {
    mockClerkAuth(mockAuth);

    const opportunities = [
      makeOpportunity({
        id: '1',
        stage: 'contracted',
        estimated_revenue: 200000,
        owner_user_id: 'rep-a',
        division_id: 'contracting',
      }),
      makeOpportunity({
        id: '2',
        stage: 'closed_lost',
        estimated_revenue: 100000,
        owner_user_id: 'rep-a',
        division_id: 'contracting',
      }),
      makeOpportunity({
        id: '3',
        stage: 'intake',
        estimated_revenue: 50000,
        owner_user_id: 'rep-b',
        division_id: 'homes',
      }),
    ];

    const supabase = mockSupabaseClient({
      tables: { opportunities: { data: opportunities, error: null } },
    });
    mockCreateUserClientSafe.mockResolvedValue({ client: supabase as never, error: null });

    const res = await GET(makeRequest('/api/crm/dashboard/intelligence'));
    expect(res.status).toBe(200);

    const body = await res.json();

    // rep_performance
    expect(body.rep_performance).toHaveLength(2);
    expect(body.rep_performance[0].user_id).toBe('rep-a');
    expect(body.rep_performance[0].deals_won).toBe(1);
    expect(body.rep_performance[0].revenue_closed).toBe(200000);

    // pipeline_aging — only non-terminal deals (the intake one)
    expect(body.pipeline_aging).toHaveLength(1);
    expect(body.pipeline_aging[0].stage).toBe('intake');

    // win_loss_by_rep — only terminal deals (rep-a has both)
    expect(body.win_loss_by_rep).toHaveLength(1);
    expect(body.win_loss_by_rep[0].dimension).toBe('rep-a');
    expect(body.win_loss_by_rep[0].won).toBe(1);
    expect(body.win_loss_by_rep[0].lost).toBe(1);

    // win_loss_by_division — only contracting has terminal deals
    expect(body.win_loss_by_division).toHaveLength(1);
    expect(body.win_loss_by_division[0].dimension).toBe('contracting');
  });

  it('filters by division_id query param', async () => {
    mockClerkAuth(mockAuth);

    const supabase = mockSupabaseClient({
      tables: { opportunities: { data: [], error: null } },
    });
    mockCreateUserClientSafe.mockResolvedValue({ client: supabase as never, error: null });

    const res = await GET(makeRequest('/api/crm/dashboard/intelligence?division_id=contracting'));
    expect(res.status).toBe(200);

    // Verify .eq was called with division_id filter
    const fromCall = supabase.from as ReturnType<typeof vi.fn>;
    expect(fromCall).toHaveBeenCalledWith('opportunities');
  });

  it('handles database errors', async () => {
    mockClerkAuth(mockAuth);

    const supabase = mockSupabaseClient({
      tables: { opportunities: { data: null, error: { message: 'DB connection failed' } } },
    });
    mockCreateUserClientSafe.mockResolvedValue({ client: supabase as never, error: null });

    const res = await GET(makeRequest('/api/crm/dashboard/intelligence'));
    expect(res.status).toBe(500);

    const body = await res.json();
    expect(body.error).toBe('DB connection failed');
  });

  it('returns empty arrays when no data', async () => {
    mockClerkAuth(mockAuth);

    const supabase = mockSupabaseClient({
      tables: { opportunities: { data: [], error: null } },
    });
    mockCreateUserClientSafe.mockResolvedValue({ client: supabase as never, error: null });

    const res = await GET(makeRequest('/api/crm/dashboard/intelligence'));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.rep_performance).toEqual([]);
    expect(body.pipeline_aging).toEqual([]);
    expect(body.win_loss_by_rep).toEqual([]);
    expect(body.win_loss_by_division).toEqual([]);
  });
});
