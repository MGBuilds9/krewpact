import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@clerk/nextjs/server', () => ({ auth: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createUserClientSafe: vi.fn() }));
vi.mock('@/lib/api/rate-limit', () => ({
  rateLimit: vi.fn().mockResolvedValue({ success: true }),
  rateLimitResponse: vi.fn(),
}));

import { auth } from '@clerk/nextjs/server';

import { GET } from '@/app/api/dashboard/executive/route';
import { createUserClientSafe } from '@/lib/supabase/server';

const mockAuth = vi.mocked(auth);
const mockCreateUserClientSafe = vi.mocked(createUserClientSafe);

function makeRequest(params: Record<string, string> = {}) {
  const url = new URL('http://localhost/api/dashboard/executive');
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  return new NextRequest(url);
}

function _mockSupabaseSelect(
  data: unknown[] | null,
  count: number | null = null,
  error: unknown = null,
) {
  const selectFn = vi.fn().mockReturnValue({
    eq: vi.fn().mockReturnValue({
      data,
      count,
      error,
    }),
    in: vi.fn().mockReturnValue({
      data,
      count,
      error,
    }),
    data,
    count,
    error,
  });

  return {
    from: vi.fn().mockReturnValue({
      select: selectFn,
    }),
  };
}

describe('GET /api/dashboard/executive', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when not authenticated', async () => {
    mockAuth.mockResolvedValue({
      userId: null,
      sessionClaims: null,
    } as any as Awaited<ReturnType<typeof auth>>);

    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
  });

  it('returns 403 when user lacks executive/platform_admin role', async () => {
    mockAuth.mockResolvedValue({
      userId: 'user_123',
      sessionClaims: {
        sub: 'user_123',
        metadata: {
          krewpact_user_id: 'user_123',
          role_keys: ['project_manager'],
        },
        krewpact_user_id: 'user_123',
      },
    } as any as Awaited<ReturnType<typeof auth>>);

    const res = await GET(makeRequest());
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toContain('Forbidden');
  });

  it('returns 200 with KPI data for executive role', async () => {
    mockAuth.mockResolvedValue({
      userId: 'user_exec',
      sessionClaims: {
        sub: 'user_exec',
        metadata: {
          krewpact_user_id: 'user_exec',
          role_keys: ['executive'],
        },
        krewpact_user_id: 'user_exec',
      },
    } as any as Awaited<ReturnType<typeof auth>>);

    const opportunities = [
      { id: '1', stage: 'qualification', estimated_revenue: 50000 },
      { id: '2', stage: 'proposal', estimated_revenue: 120000 },
      { id: '3', stage: 'qualification', estimated_revenue: 80000 },
      { id: '4', stage: 'closed_won', estimated_revenue: 200000 },
    ];
    const projects = [
      { id: 'p1', status: 'active' },
      { id: 'p2', status: 'active' },
      { id: 'p3', status: 'completed' },
    ];
    const estimates = [
      { id: 'e1', status: 'sent', total_amount: 100000 },
      { id: 'e2', status: 'accepted', total_amount: 75000 },
      { id: 'e3', status: 'sent', total_amount: 50000 },
    ];

    const mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === 'opportunities') {
        return {
          select: vi.fn().mockReturnValue({
            data: opportunities,
            count: opportunities.length,
            error: null,
          }),
        };
      }
      if (table === 'projects') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              data: projects.filter((p) => p.status === 'active'),
              count: projects.filter((p) => p.status === 'active').length,
              error: null,
            }),
            data: projects,
            count: projects.length,
            error: null,
          }),
        };
      }
      if (table === 'estimates') {
        return {
          select: vi.fn().mockReturnValue({
            data: estimates,
            count: estimates.length,
            error: null,
          }),
        };
      }
      return {
        select: vi.fn().mockReturnValue({
          data: [],
          count: 0,
          error: null,
        }),
      };
    });

    mockCreateUserClientSafe.mockResolvedValue({ client: { from: mockFrom } as any, error: null });

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.kpis).toBeDefined();
    expect(body.kpis.totalPipelineValue).toBe(450000);
    expect(body.kpis.activeProjects).toBe(2);
    expect(body.kpis.winRate).toBeCloseTo(25, 0);
    expect(body.kpis.avgDealSize).toBeCloseTo(112500, 0);
    expect(body.pipeline).toBeDefined();
    expect(Array.isArray(body.pipeline)).toBe(true);
  });

  it('returns 200 with KPI data for platform_admin role', async () => {
    mockAuth.mockResolvedValue({
      userId: 'user_admin',
      sessionClaims: {
        sub: 'user_admin',
        metadata: {
          krewpact_user_id: 'user_admin',
          role_keys: ['platform_admin'],
        },
        krewpact_user_id: 'user_admin',
      },
    } as any as Awaited<ReturnType<typeof auth>>);

    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          data: [],
          count: 0,
          error: null,
        }),
        data: [],
        count: 0,
        error: null,
      }),
    });

    mockCreateUserClientSafe.mockResolvedValue({ client: { from: mockFrom } as any, error: null });

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.kpis.totalPipelineValue).toBe(0);
    expect(body.kpis.activeProjects).toBe(0);
    expect(body.kpis.winRate).toBe(0);
    expect(body.kpis.avgDealSize).toBe(0);
    expect(body.pipeline).toEqual([]);
  });

  it('returns 500 when database query fails', async () => {
    mockAuth.mockResolvedValue({
      userId: 'user_exec',
      sessionClaims: {
        sub: 'user_exec',
        metadata: {
          krewpact_user_id: 'user_exec',
          role_keys: ['executive'],
        },
        krewpact_user_id: 'user_exec',
      },
    } as any as Awaited<ReturnType<typeof auth>>);

    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          data: null,
          count: null,
          error: { message: 'DB error' },
        }),
        data: null,
        count: null,
        error: { message: 'DB error' },
      }),
    });

    mockCreateUserClientSafe.mockResolvedValue({ client: { from: mockFrom } as any, error: null });

    const res = await GET(makeRequest());
    expect(res.status).toBe(500);
  });

  it('calculates pipeline stages correctly', async () => {
    mockAuth.mockResolvedValue({
      userId: 'user_exec',
      sessionClaims: {
        sub: 'user_exec',
        metadata: {
          krewpact_user_id: 'user_exec',
          role_keys: ['executive'],
        },
        krewpact_user_id: 'user_exec',
      },
    } as any as Awaited<ReturnType<typeof auth>>);

    const opportunities = [
      { id: '1', stage: 'qualification', estimated_revenue: 50000 },
      { id: '2', stage: 'qualification', estimated_revenue: 30000 },
      { id: '3', stage: 'proposal', estimated_revenue: 100000 },
      { id: '4', stage: 'negotiation', estimated_revenue: 200000 },
      { id: '5', stage: 'closed_won', estimated_revenue: 150000 },
      { id: '6', stage: 'closed_lost', estimated_revenue: 75000 },
    ];

    const mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === 'opportunities') {
        return {
          select: vi.fn().mockReturnValue({
            data: opportunities,
            count: opportunities.length,
            error: null,
          }),
        };
      }
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({ data: [], count: 0, error: null }),
          data: [],
          count: 0,
          error: null,
        }),
      };
    });

    mockCreateUserClientSafe.mockResolvedValue({ client: { from: mockFrom } as any, error: null });

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);

    const body = await res.json();
    const pipeline = body.pipeline as { stage: string; count: number; value: number }[];

    const qual = pipeline.find((p) => p.stage === 'qualification');
    expect(qual).toBeDefined();
    expect(qual?.count).toBe(2);
    expect(qual?.value).toBe(80000);

    const proposal = pipeline.find((p) => p.stage === 'proposal');
    expect(proposal?.count).toBe(1);
    expect(proposal?.value).toBe(100000);
  });
});
