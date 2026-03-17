import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}));
vi.mock('@/lib/supabase/server', () => ({ createUserClientSafe: vi.fn() }));
vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

import { auth } from '@clerk/nextjs/server';

import { GET } from '@/app/api/executive/overview/route';
import { createUserClientSafe } from '@/lib/supabase/server';

const mockAuth = vi.mocked(auth);
const mockCreateUserClientSafe = vi.mocked(createUserClientSafe);

function makeRequest(url = 'http://localhost/api/executive/overview') {
  return new NextRequest(new URL(url));
}

function makeExecutiveAuth() {
  mockAuth.mockResolvedValue({
    userId: 'user_exec',
    sessionClaims: {
      sub: 'user_exec',
      metadata: { krewpact_user_id: 'user_exec', role_keys: ['executive'] },
      krewpact_user_id: 'user_exec',
    },
  } as any as Awaited<ReturnType<typeof auth>>);
}

/**
 * Build a mock Supabase client that handles:
 * - .from(table).select(...) — resolves directly (for estimates, cache)
 * - .from(table).select(...).eq('division_id', div) — resolves with same data (for division filter)
 */
function makeDivisionSupabaseMock(
  overrides: {
    opportunities?: unknown[];
    projects?: unknown[];
    executive_subscriptions?: unknown[];
    estimates?: unknown[];
    executive_metrics_cache?: unknown[];
  } = {},
) {
  const opportunities = overrides.opportunities ?? [];
  const projects = overrides.projects ?? [];
  const subscriptions = overrides.executive_subscriptions ?? [];
  const estimates = overrides.estimates ?? [];
  const cache = overrides.executive_metrics_cache ?? [];

  // Creates a chain where select() returns a Promise that also has .eq()
  // This allows both: `await supabase.from(t).select(...)` and
  // `await supabase.from(t).select(...).eq('division_id', x)`
  function makeFilterableChain(data: unknown[]) {
    const selectResult = Object.assign(Promise.resolve({ data, error: null }), {
      eq: vi.fn().mockResolvedValue({ data, error: null }),
    });
    return {
      select: vi.fn().mockReturnValue(selectResult),
    };
  }

  function makeCacheChain(data: unknown[]) {
    return {
      select: vi.fn().mockResolvedValue({ data, error: null }),
    };
  }

  return {
    from: vi.fn((table: string) => {
      switch (table) {
        case 'opportunities':
          return makeFilterableChain(opportunities);
        case 'projects':
          return makeFilterableChain(projects);
        case 'executive_subscriptions':
          return makeFilterableChain(subscriptions);
        case 'estimates':
          return makeFilterableChain(estimates);
        case 'executive_metrics_cache':
          return makeCacheChain(cache);
        default:
          return { select: vi.fn().mockResolvedValue({ data: [], error: null }) };
      }
    }),
  };
}

describe('GET /api/executive/overview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('without division param (cached path)', () => {
    it('returns 401 when not authenticated', async () => {
      mockAuth.mockResolvedValue({
        userId: null,
        sessionClaims: null,
      } as any as Awaited<ReturnType<typeof auth>>);

      const res = await GET(makeRequest());
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error).toBe('Unauthorized');
    });

    it('returns 403 for non-executive role', async () => {
      mockAuth.mockResolvedValue({
        userId: 'user_pm',
        sessionClaims: {
          sub: 'user_pm',
          metadata: { krewpact_user_id: 'user_pm', role_keys: ['project_manager'] },
          krewpact_user_id: 'user_pm',
        },
      } as any as Awaited<ReturnType<typeof auth>>);

      const res = await GET(makeRequest());
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error).toBe('Forbidden');
    });

    it('returns cached metrics when no division param is provided', async () => {
      makeExecutiveAuth();

      const cacheRows = [
        {
          metric_key: 'pipeline_summary',
          metric_value: {
            totalValue: 500000,
            stageBreakdown: [],
            winRate: 60,
            avgDealSize: 50000,
          },
          computed_at: '2026-03-09T10:00:00Z',
        },
        {
          metric_key: 'project_portfolio',
          metric_value: { activeCount: 5, statusBreakdown: [] },
          computed_at: '2026-03-09T10:00:00Z',
        },
      ];

      mockCreateUserClientSafe.mockResolvedValue({
        client: makeDivisionSupabaseMock({
          executive_metrics_cache: cacheRows,
        }) as any,
        error: null,
      });

      const res = await GET(makeRequest());
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.metrics).toBeDefined();
      expect(body.metrics.pipeline_summary).toBeDefined();
      expect(body.metrics.pipeline_summary.value.totalValue).toBe(500000);
      expect(body.metrics.project_portfolio).toBeDefined();
    });

    it('returns empty metrics object when cache is empty', async () => {
      makeExecutiveAuth();

      mockCreateUserClientSafe.mockResolvedValue({
        client: makeDivisionSupabaseMock({ executive_metrics_cache: [] }) as any,
        error: null,
      });

      const res = await GET(makeRequest());
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.metrics).toEqual({});
    });
  });

  describe('with division param (on-the-fly path)', () => {
    it('returns 200 with division-filtered metrics for a valid division', async () => {
      makeExecutiveAuth();

      const divisionOpps = [
        { id: 'opp-1', stage: 'proposal', estimated_revenue: 100000 },
        { id: 'opp-2', stage: 'closed_won', estimated_revenue: 200000 },
      ];
      const divisionProjects = [
        { id: 'proj-1', status: 'active' },
        { id: 'proj-2', status: 'active' },
      ];
      const divisionSubs = [
        { id: 'sub-1', monthly_cost: 500, is_active: true, renewal_date: null },
      ];

      mockCreateUserClientSafe.mockResolvedValue({
        client: makeDivisionSupabaseMock({
          opportunities: divisionOpps,
          projects: divisionProjects,
          executive_subscriptions: divisionSubs,
          estimates: [],
        }) as any,
        error: null,
      });

      const res = await GET(
        makeRequest('http://localhost/api/executive/overview?division=contracting'),
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.metrics).toBeDefined();
      expect(body.metrics.pipeline_summary).toBeDefined();
      expect(body.metrics.project_portfolio).toBeDefined();
      expect(body.metrics.subscription_summary).toBeDefined();
      expect(body.metrics.estimating_velocity).toBeDefined();
      // Computed on-the-fly — timestamp should be present
      expect(body.metrics.pipeline_summary.computed_at).toBeDefined();
    });

    it('returns empty metrics gracefully for an unknown division', async () => {
      makeExecutiveAuth();

      mockCreateUserClientSafe.mockResolvedValue({
        client: makeDivisionSupabaseMock() as any,
        error: null,
      });

      const res = await GET(
        makeRequest('http://localhost/api/executive/overview?division=unknown-division'),
      );
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.metrics).toEqual({});
    });

    it('handles all valid divisions without error', async () => {
      const validDivisions = ['contracting', 'homes', 'wood', 'telecom', 'group-inc', 'management'];

      for (const div of validDivisions) {
        vi.clearAllMocks();
        makeExecutiveAuth();

        mockCreateUserClientSafe.mockResolvedValue({
          client: makeDivisionSupabaseMock() as any,
          error: null,
        });

        const res = await GET(
          makeRequest(`http://localhost/api/executive/overview?division=${div}`),
        );
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.metrics).toBeDefined();
      }
    });

    it('includes estimating_velocity using org-wide data (estimates have no division_id)', async () => {
      makeExecutiveAuth();

      const allEstimates = [
        { id: 'est-1', status: 'draft' },
        { id: 'est-2', status: 'approved' },
        { id: 'est-3', status: 'draft' },
      ];

      mockCreateUserClientSafe.mockResolvedValue({
        client: makeDivisionSupabaseMock({
          estimates: allEstimates,
        }) as any,
        error: null,
      });

      const res = await GET(makeRequest('http://localhost/api/executive/overview?division=homes'));
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.metrics.estimating_velocity).toBeDefined();
      expect(body.metrics.estimating_velocity.value.totalEstimates).toBe(3);
    });
  });
});
