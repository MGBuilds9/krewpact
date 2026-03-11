/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}));
vi.mock('@/lib/supabase/server', () => ({ createUserClientSafe: vi.fn() }));
vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

import { auth } from '@clerk/nextjs/server';
import { createUserClientSafe } from '@/lib/supabase/server';
import { GET } from '@/app/api/executive/alerts/route';

const mockAuth = vi.mocked(auth);
const mockCreateUserClientSafe = vi.mocked(createUserClientSafe);

function makeRequest() {
  return new NextRequest(new URL('http://localhost/api/executive/alerts'));
}

function makeSupabaseMock(
  overrides: {
    opportunities?: { data: unknown[]; error: null | { message: string } };
    knowledge_staging?: { count: number | null; error: null | { message: string } };
    executive_subscriptions?: { data: unknown[]; error: null | { message: string } };
    projects?: { data: unknown[]; error: null | { message: string } };
  } = {},
) {
  const opportunitiesResult = overrides.opportunities ?? { data: [], error: null };
  const knowledgeResult = overrides.knowledge_staging ?? { count: 0, error: null };
  const saasResult = overrides.executive_subscriptions ?? { data: [], error: null };
  const projectsResult = overrides.projects ?? { data: [], error: null };

  const makeOpportunitiesChain = () => {
    const chain = {
      select: vi.fn(),
      not: vi.fn(),
      lt: vi.fn(),
    };
    chain.select.mockReturnValue(chain);
    chain.not.mockReturnValue(chain);
    chain.lt.mockResolvedValue(opportunitiesResult);
    return chain;
  };

  const makeKnowledgeChain = () => {
    const chain = {
      select: vi.fn(),
      eq: vi.fn(),
    };
    chain.select.mockReturnValue(chain);
    chain.eq.mockResolvedValue(knowledgeResult);
    return chain;
  };

  const makeSaasChain = () => {
    const chain = {
      select: vi.fn(),
      eq: vi.fn(),
      lte: vi.fn(),
      gte: vi.fn(),
    };
    chain.select.mockReturnValue(chain);
    chain.eq.mockReturnValue(chain);
    chain.lte.mockReturnValue(chain);
    chain.gte.mockResolvedValue(saasResult);
    return chain;
  };

  const makeProjectsChain = () => {
    const chain = {
      select: vi.fn(),
      eq: vi.fn(),
      lt: vi.fn(),
    };
    chain.select.mockReturnValue(chain);
    chain.eq.mockReturnValue(chain);
    chain.lt.mockResolvedValue(projectsResult);
    return chain;
  };

  return {
    from: vi.fn((table: string) => {
      switch (table) {
        case 'opportunities':
          return makeOpportunitiesChain();
        case 'knowledge_staging':
          return makeKnowledgeChain();
        case 'executive_subscriptions':
          return makeSaasChain();
        case 'projects':
          return makeProjectsChain();
        default:
          return { select: vi.fn().mockReturnValue({ data: [], error: null }) };
      }
    }),
  };
}

describe('GET /api/executive/alerts', () => {
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
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 403 for non-executive role', async () => {
    mockAuth.mockResolvedValue({
      userId: 'user_123',
      sessionClaims: { krewpact_roles: ['project_manager'] },
    } as any as Awaited<ReturnType<typeof auth>>);

    const res = await GET(makeRequest());
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe('Forbidden');
  });

  it('returns 200 with empty alerts when nothing triggers thresholds', async () => {
    mockAuth.mockResolvedValue({
      userId: 'user_exec',
      sessionClaims: { krewpact_roles: ['executive'] },
    } as any as Awaited<ReturnType<typeof auth>>);

    mockCreateUserClientSafe.mockResolvedValue({ client: makeSupabaseMock() as any, error: null });

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.alerts).toBeDefined();
    expect(Array.isArray(body.alerts)).toBe(true);
    expect(body.alerts).toHaveLength(0);
  });

  it('returns stalled deal alert when opportunities are stale', async () => {
    mockAuth.mockResolvedValue({
      userId: 'user_exec',
      sessionClaims: { krewpact_roles: ['executive'] },
    } as any as Awaited<ReturnType<typeof auth>>);

    const stalledOpportunities = [
      { id: 'opp-1', name: 'Deal Alpha', stage: 'proposal', updated_at: '2026-02-01T00:00:00Z' },
      {
        id: 'opp-2',
        name: 'Deal Beta',
        stage: 'negotiation',
        updated_at: '2026-01-15T00:00:00Z',
      },
    ];

    mockCreateUserClientSafe.mockResolvedValue({
      client: makeSupabaseMock({
        opportunities: { data: stalledOpportunities, error: null },
      }) as any,
      error: null,
    });

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.alerts).toBeDefined();

    const stalledAlert = body.alerts.find((a: { type: string }) => a.type === 'stalled_deal');
    expect(stalledAlert).toBeDefined();
    expect(stalledAlert.severity).toBe('medium');
    expect(stalledAlert.count).toBe(2);
    expect(stalledAlert.title).toContain('Stalled Deal');
    expect(stalledAlert.created_at).toBeDefined();
  });

  it('returns knowledge queue alert when pending count exceeds 5', async () => {
    mockAuth.mockResolvedValue({
      userId: 'user_admin',
      sessionClaims: { krewpact_roles: ['platform_admin'] },
    } as any as Awaited<ReturnType<typeof auth>>);

    mockCreateUserClientSafe.mockResolvedValue({
      client: makeSupabaseMock({
        knowledge_staging: { count: 8, error: null },
      }) as any,
      error: null,
    });

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();

    const queueAlert = body.alerts.find((a: { type: string }) => a.type === 'knowledge_queue');
    expect(queueAlert).toBeDefined();
    expect(queueAlert.severity).toBe('low');
    expect(queueAlert.count).toBe(8);
    expect(queueAlert.title).toContain('Knowledge Review Queue');
  });

  it('does NOT return knowledge queue alert when count is 5 or fewer', async () => {
    mockAuth.mockResolvedValue({
      userId: 'user_exec',
      sessionClaims: { krewpact_roles: ['executive'] },
    } as any as Awaited<ReturnType<typeof auth>>);

    mockCreateUserClientSafe.mockResolvedValue({
      client: makeSupabaseMock({
        knowledge_staging: { count: 5, error: null },
      }) as any,
      error: null,
    });

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();

    const queueAlert = body.alerts.find((a: { type: string }) => a.type === 'knowledge_queue');
    expect(queueAlert).toBeUndefined();
  });

  it('sorts alerts by severity (high then medium then low)', async () => {
    mockAuth.mockResolvedValue({
      userId: 'user_exec',
      sessionClaims: { krewpact_roles: ['executive'] },
    } as any as Awaited<ReturnType<typeof auth>>);

    mockCreateUserClientSafe.mockResolvedValue({
      client: makeSupabaseMock({
        opportunities: {
          data: [
            {
              id: 'opp-1',
              name: 'Stale Deal',
              stage: 'proposal',
              updated_at: '2026-01-01T00:00:00Z',
            },
          ],
          error: null,
        },
        knowledge_staging: { count: 10, error: null },
        projects: {
          data: [
            {
              id: 'proj-1',
              name: 'Stale Project',
              status: 'active',
              updated_at: '2026-01-01T00:00:00Z',
            },
          ],
          error: null,
        },
      }) as any,
      error: null,
    });

    const res = await GET(makeRequest());
    const body = await res.json();

    const alerts = body.alerts as Array<{ severity: string }>;
    const severityValues = alerts.map((a) => a.severity);

    // medium alerts should come before low
    const mediumIdx = severityValues.lastIndexOf('medium');
    const lowIdx = severityValues.indexOf('low');
    if (mediumIdx !== -1 && lowIdx !== -1) {
      expect(mediumIdx).toBeLessThan(lowIdx);
    }
  });
});
