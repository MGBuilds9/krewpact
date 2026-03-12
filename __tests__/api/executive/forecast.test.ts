/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}));
vi.mock('@/lib/supabase/server', () => ({ createUserClientSafe: vi.fn() }));
vi.mock('@/lib/api/org', () => ({ getOrgIdFromAuth: vi.fn(), getKrewpactRoles: vi.fn() }));
vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

import { auth } from '@clerk/nextjs/server';
import { createUserClientSafe } from '@/lib/supabase/server';
import { getOrgIdFromAuth, getKrewpactRoles } from '@/lib/api/org';
import { GET } from '@/app/api/executive/forecast/route';

const mockAuth = vi.mocked(auth);
const mockCreateUserClientSafe = vi.mocked(createUserClientSafe);
const mockGetOrgIdFromAuth = vi.mocked(getOrgIdFromAuth);
const mockGetKrewpactRoles = vi.mocked(getKrewpactRoles);

function makeRequest() {
  return new NextRequest(new URL('http://localhost/api/executive/forecast'));
}

interface OpportunityRow {
  id: string;
  stage: string;
  estimated_revenue: number;
  expected_close_date: string;
}

function makeSupabaseMock(opportunities: OpportunityRow[] = []) {
  const chain = {
    select: vi.fn(),
    eq: vi.fn(),
    not: vi.fn(),
  };
  // Each chained method returns the chain except the last `.not` which resolves
  chain.select.mockReturnValue(chain);
  chain.eq.mockReturnValue(chain);
  // Third .not call resolves (estimated_revenue is null)
  let notCallCount = 0;
  chain.not.mockImplementation(() => {
    notCallCount++;
    if (notCallCount >= 3) {
      return Promise.resolve({ data: opportunities, error: null });
    }
    return chain;
  });

  return {
    from: vi.fn(() => chain),
  };
}

describe('GET /api/executive/forecast', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetOrgIdFromAuth.mockResolvedValue('mdm-group');
    mockGetKrewpactRoles.mockResolvedValue(['executive']);
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
    mockGetKrewpactRoles.mockResolvedValue(['project_manager']);

    const res = await GET(makeRequest());
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toBe('Forbidden');
  });

  it('returns 200 with 8 quarterly buckets', async () => {
    mockAuth.mockResolvedValue({
      userId: 'user_exec',
      sessionClaims: { krewpact_roles: ['executive'] },
    } as any as Awaited<ReturnType<typeof auth>>);

    mockCreateUserClientSafe.mockResolvedValue({
      client: makeSupabaseMock([]) as any,
      error: null,
    });

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.forecast).toBeDefined();
    expect(Array.isArray(body.forecast)).toBe(true);
    expect(body.forecast).toHaveLength(8);
  });

  it('handles empty opportunities gracefully — all quarters return zero', async () => {
    mockAuth.mockResolvedValue({
      userId: 'user_exec',
      sessionClaims: { krewpact_roles: ['executive'] },
    } as any as Awaited<ReturnType<typeof auth>>);

    mockCreateUserClientSafe.mockResolvedValue({
      client: makeSupabaseMock([]) as any,
      error: null,
    });

    const res = await GET(makeRequest());
    const body = await res.json();

    for (const quarter of body.forecast) {
      expect(quarter.signed).toBe(0);
      expect(quarter.weighted).toBe(0);
      expect(quarter.total).toBe(0);
    }
  });

  it('applies stage weights correctly', async () => {
    mockAuth.mockResolvedValue({
      userId: 'user_exec',
      sessionClaims: { krewpact_roles: ['executive'] },
    } as any as Awaited<ReturnType<typeof auth>>);

    const currentYear = new Date().getFullYear();

    const opportunities: OpportunityRow[] = [
      {
        id: 'opp-1',
        stage: 'closed_won',
        estimated_revenue: 100_000,
        expected_close_date: `${currentYear}-02-15`, // Q1
      },
      {
        id: 'opp-2',
        stage: 'negotiation',
        estimated_revenue: 200_000,
        expected_close_date: `${currentYear}-02-28`, // Q1 — weighted at 75%
      },
      {
        id: 'opp-3',
        stage: 'proposal',
        estimated_revenue: 400_000,
        expected_close_date: `${currentYear}-02-10`, // Q1 — weighted at 50%
      },
    ];

    mockCreateUserClientSafe.mockResolvedValue({
      client: makeSupabaseMock(opportunities) as any,
      error: null,
    });

    const res = await GET(makeRequest());
    const body = await res.json();

    const q1 = body.forecast.find((q: { quarter: string }) => q.quarter === `Q1 ${currentYear}`);
    expect(q1).toBeDefined();

    // signed = 100,000 (closed_won at 100%)
    expect(q1.signed).toBe(100_000);
    // weighted = 200,000 * 0.75 + 400,000 * 0.50 = 150,000 + 200,000 = 350,000
    expect(q1.weighted).toBe(350_000);
    // total = 100,000 + 350,000 = 450,000
    expect(q1.total).toBe(450_000);
  });

  it('marks exactly one quarter as isCurrent', async () => {
    mockAuth.mockResolvedValue({
      userId: 'user_admin',
      sessionClaims: { krewpact_roles: ['platform_admin'] },
    } as any as Awaited<ReturnType<typeof auth>>);

    mockCreateUserClientSafe.mockResolvedValue({
      client: makeSupabaseMock([]) as any,
      error: null,
    });

    const res = await GET(makeRequest());
    const body = await res.json();

    const currentQuarters = body.forecast.filter(
      (q: { isCurrent: boolean }) => q.isCurrent === true,
    );
    expect(currentQuarters).toHaveLength(1);
  });

  it('returns forecast data with correct shape', async () => {
    mockAuth.mockResolvedValue({
      userId: 'user_exec',
      sessionClaims: { krewpact_roles: ['executive'] },
    } as any as Awaited<ReturnType<typeof auth>>);

    mockCreateUserClientSafe.mockResolvedValue({
      client: makeSupabaseMock([]) as any,
      error: null,
    });

    const res = await GET(makeRequest());
    const body = await res.json();

    for (const quarter of body.forecast) {
      expect(quarter).toHaveProperty('quarter');
      expect(quarter).toHaveProperty('signed');
      expect(quarter).toHaveProperty('weighted');
      expect(quarter).toHaveProperty('total');
      expect(quarter).toHaveProperty('isCurrent');
      expect(typeof quarter.quarter).toBe('string');
      expect(typeof quarter.signed).toBe('number');
      expect(typeof quarter.weighted).toBe('number');
      expect(typeof quarter.total).toBe('number');
      expect(typeof quarter.isCurrent).toBe('boolean');
      expect(quarter.total).toBe(quarter.signed + quarter.weighted);
    }
  });
});
