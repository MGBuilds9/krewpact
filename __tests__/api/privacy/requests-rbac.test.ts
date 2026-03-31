import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGetKrewpactRoles = vi.fn();
vi.mock('@/lib/api/org', () => ({
  requireRole: vi.fn(),
  getKrewpactRoles: () => mockGetKrewpactRoles(),
  getKrewpactOrgId: vi.fn().mockResolvedValue('test-org-00000000-0000-0000-0000-000000000000'),
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

import { makeJsonRequest, makeRequest, mockClerkAuth } from '@/__tests__/helpers';

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

describe('RBAC: GET /api/privacy/requests', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 403 for non-platform_admin', async () => {
    mockClerkAuth(mockAuth);
    mockGetKrewpactRoles.mockResolvedValue(['project_manager']);
    const { GET } = await import('@/app/api/privacy/requests/route');
    const res = await GET(makeRequest('/api/privacy/requests'));
    expect(res.status).toBe(403);
  });

  it('returns 200 for platform_admin', async () => {
    mockClerkAuth(mockAuth);
    mockGetKrewpactRoles.mockResolvedValue(['platform_admin']);
    mockFrom.mockReturnValue(paginatedChain([], 0));
    const { GET } = await import('@/app/api/privacy/requests/route');
    const res = await GET(makeRequest('/api/privacy/requests'));
    expect(res.status).toBe(200);
  });
});

describe('RBAC: POST /api/privacy/requests', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 403 for non-platform_admin', async () => {
    mockClerkAuth(mockAuth);
    mockGetKrewpactRoles.mockResolvedValue(['estimator']);
    const { POST } = await import('@/app/api/privacy/requests/route');
    const res = await POST(
      makeJsonRequest('/api/privacy/requests', {
        requester_email: 'a@b.com',
        request_type: 'access',
      }),
    );
    expect(res.status).toBe(403);
  });

  it('returns 201 for platform_admin with valid body', async () => {
    mockClerkAuth(mockAuth);
    mockGetKrewpactRoles.mockResolvedValue(['platform_admin']);
    const newRequest = {
      id: 'pr-1',
      requester_email: 'user@example.com',
      request_type: 'access',
      status: 'received',
    };
    mockFrom.mockReturnValue(paginatedChain([newRequest], 1));
    const { POST } = await import('@/app/api/privacy/requests/route');
    const res = await POST(
      makeJsonRequest('/api/privacy/requests', {
        requester_email: 'user@example.com',
        requester_name: 'Test User',
        request_type: 'access',
        legal_basis: 'PIPEDA s.8',
      }),
    );
    expect(res.status).toBe(201);
  });
});
