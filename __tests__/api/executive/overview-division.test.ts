import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}));
vi.mock('@/lib/supabase/server', () => ({ createUserClientSafe: vi.fn() }));
vi.mock('@/lib/api/org', () => ({
  getKrewpactRoles: vi.fn(),
  getKrewpactOrgId: vi.fn().mockResolvedValue('test-org-00000000-0000-0000-0000-000000000000'),
}));
vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), child: vi.fn().mockReturnThis() },
}));
vi.mock('@/lib/api/rate-limit', () => ({
  rateLimit: vi.fn().mockResolvedValue({ success: true }),
  rateLimitResponse: vi.fn(),
}));
vi.mock('@/lib/request-context', () => ({
  generateRequestId: vi.fn().mockReturnValue('test-request-id'),
  requestContext: { run: vi.fn().mockImplementation((_ctx, fn) => fn()) },
}));

import { auth } from '@clerk/nextjs/server';

import { GET } from '@/app/api/executive/overview/route';
import { getKrewpactRoles } from '@/lib/api/org';
import { createUserClientSafe } from '@/lib/supabase/server';

const mockAuth = vi.mocked(auth);
const mockCreateUserClientSafe = vi.mocked(createUserClientSafe);
const mockGetKrewpactRoles = vi.mocked(getKrewpactRoles);

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
  mockGetKrewpactRoles.mockResolvedValue(['executive']);
}

/**
 * Build a mock Supabase client that handles:
 * - .rpc(name, params?) — for all metrics computed via RPC (pipeline, portfolio, subs, estimating)
 * - .from(table).select(...) — for the cache-read path (executive_metrics_cache)
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

  // Map RPC names to their pre-aggregated row shapes
  function rpcData(name: string): unknown[] {
    switch (name) {
      case 'get_pipeline_summary':
        // Convert raw opportunity rows into pre-aggregated stage rows
        if (opportunities.length === 0) return [];
        {
          const stageMap: Record<string, { count: number; value: number }> = {};
          for (const opp of opportunities as {
            stage: string | null;
            estimated_revenue: number | null;
          }[]) {
            const stage = opp.stage ?? 'unknown';
            if (!stageMap[stage]) stageMap[stage] = { count: 0, value: 0 };
            stageMap[stage].count++;
            stageMap[stage].value += opp.estimated_revenue ?? 0;
          }
          return Object.entries(stageMap).map(([stage, d]) => ({
            stage,
            count: d.count,
            value: d.value,
          }));
        }
      case 'get_project_portfolio':
        if (projects.length === 0) return [];
        {
          const statusMap: Record<string, number> = {};
          for (const p of projects as { status: string | null }[]) {
            const s = p.status ?? 'unknown';
            statusMap[s] = (statusMap[s] ?? 0) + 1;
          }
          return Object.entries(statusMap).map(([status, count]) => ({ status, count }));
        }
      case 'get_estimating_velocity':
        if (estimates.length === 0) return [];
        {
          const statusMap: Record<string, number> = {};
          for (const e of estimates as { status: string | null }[]) {
            const s = e.status ?? 'unknown';
            statusMap[s] = (statusMap[s] ?? 0) + 1;
          }
          return Object.entries(statusMap).map(([status, count]) => ({ status, count }));
        }
      case 'get_subscription_summary':
        if (subscriptions.length === 0) return [];
        {
          const active = (
            subscriptions as {
              monthly_cost: number;
              is_active: boolean;
              renewal_date: string | null;
            }[]
          ).filter((s) => s.is_active);
          const total_monthly = active.reduce((sum, s) => sum + (Number(s.monthly_cost) || 0), 0);
          const active_count = active.length;
          const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split('T')[0];
          const today = new Date().toISOString().split('T')[0];
          const expiring_soon_count = active.filter(
            (s) => s.renewal_date && s.renewal_date >= today && s.renewal_date <= sevenDaysFromNow,
          ).length;
          return [{ total_monthly, active_count, expiring_soon_count }];
        }
      default:
        return [];
    }
  }

  return {
    rpc: vi.fn((name: string) => Promise.resolve({ data: rpcData(name), error: null })),
    from: vi.fn((table: string) => {
      if (table === 'executive_metrics_cache') {
        return { select: vi.fn().mockResolvedValue({ data: cache, error: null }) };
      }
      return { select: vi.fn().mockResolvedValue({ data: [], error: null }) };
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
      expect(body.error.code).toBe('UNAUTHORIZED');
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
      mockGetKrewpactRoles.mockResolvedValue(['project_manager']);

      const res = await GET(makeRequest());
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error.code).toBe('FORBIDDEN');
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
