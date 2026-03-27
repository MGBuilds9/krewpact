import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGetKrewpactRoles = vi.fn();
vi.mock('@/lib/api/org', () => ({
  requireRole: vi.fn(),
  getKrewpactRoles: () => mockGetKrewpactRoles(),
}));
vi.mock('@clerk/nextjs/server', () => ({ auth: vi.fn() }));

const mockFrom = vi.fn();
vi.mock('@/lib/supabase/server', () => ({
  createUserClientSafe: vi.fn().mockResolvedValue({
    client: { from: (...args: unknown[]) => mockFrom(...args) },
    error: null,
  }),
}));
vi.mock('@/lib/api/rate-limit', () => ({
  rateLimit: vi.fn().mockResolvedValue({ success: true }),
  rateLimitResponse: vi.fn(),
}));
vi.mock('@/lib/request-context', () => ({
  requestContext: { run: (_: unknown, fn: () => unknown) => fn() },
  generateRequestId: () => 'req_test',
}));
vi.mock('@/lib/logger', () => {
  const m = { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn(), child: vi.fn() };
  m.child.mockReturnValue(m);
  return { logger: m };
});

import { auth } from '@clerk/nextjs/server';

import { makeJsonRequest, makeRequest, mockClerkAuth, mockClerkUnauth } from '@/__tests__/helpers';

const mockAuth = vi.mocked(auth);

function paginatedChain(data: unknown[], count: number) {
  const chain: Record<string, unknown> = {};
  chain.select = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.order = vi.fn().mockReturnValue(chain);
  chain.range = vi.fn().mockReturnValue(chain);
  chain.insert = vi.fn().mockReturnValue(chain);
  chain.single = vi.fn().mockResolvedValue({ data: data[0] ?? null, error: null });
  chain.then = (resolve: (v: unknown) => void) => resolve({ data, error: null, count });
  return chain;
}

const BCP_ROLES = ['platform_admin', 'executive'];

describe('RBAC: GET /api/bcp/incidents', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 403 for user without required role', async () => {
    mockClerkAuth(mockAuth);
    mockGetKrewpactRoles.mockResolvedValue(['project_manager']);
    const { GET } = await import('@/app/api/bcp/incidents/route');
    const res = await GET(makeRequest('/api/bcp/incidents'));
    expect(res.status).toBe(403);
  });

  it('returns 200 for platform_admin', async () => {
    mockClerkAuth(mockAuth);
    mockGetKrewpactRoles.mockResolvedValue(['platform_admin']);
    mockFrom.mockReturnValue(paginatedChain([], 0));
    const { GET } = await import('@/app/api/bcp/incidents/route');
    const res = await GET(makeRequest('/api/bcp/incidents'));
    expect(res.status).toBe(200);
  });

  it('returns 200 for executive', async () => {
    mockClerkAuth(mockAuth);
    mockGetKrewpactRoles.mockResolvedValue(['executive']);
    mockFrom.mockReturnValue(paginatedChain([], 0));
    const { GET } = await import('@/app/api/bcp/incidents/route');
    const res = await GET(makeRequest('/api/bcp/incidents'));
    expect(res.status).toBe(200);
  });
});

describe('RBAC: POST /api/bcp/incidents', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 403 for user without required role', async () => {
    mockClerkAuth(mockAuth);
    mockGetKrewpactRoles.mockResolvedValue(['estimator']);
    const { POST } = await import('@/app/api/bcp/incidents/route');
    const res = await POST(
      makeJsonRequest('/api/bcp/incidents', {
        incident_number: 'INC-001',
        severity: 'sev1',
        title: 'Network Outage',
      }),
    );
    expect(res.status).toBe(403);
  });

  it('returns 201 for executive with valid body', async () => {
    mockClerkAuth(mockAuth);
    mockGetKrewpactRoles.mockResolvedValue(['executive']);
    const newIncident = {
      id: 'inc-1',
      incident_number: 'INC-001',
      severity: 'high',
      status: 'open',
    };
    mockFrom.mockReturnValue(paginatedChain([newIncident], 1));
    const { POST } = await import('@/app/api/bcp/incidents/route');
    const res = await POST(
      makeJsonRequest('/api/bcp/incidents', {
        incident_number: 'INC-001',
        title: 'Network Outage',
        severity: 'sev1',
      }),
    );
    expect(res.status).toBe(201);
  });
});
