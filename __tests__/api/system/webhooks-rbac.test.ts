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

import { makeRequest, mockClerkAuth } from '@/__tests__/helpers';

const mockAuth = vi.mocked(auth);

function paginatedChain(data: unknown[], count: number) {
  const chain: Record<string, unknown> = {};
  chain.select = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.order = vi.fn().mockReturnValue(chain);
  chain.range = vi.fn().mockReturnValue(chain);
  chain.then = (resolve: (v: unknown) => void) => resolve({ data, error: null, count });
  return chain;
}

describe('RBAC: GET /api/system/webhooks', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 403 for non-platform_admin', async () => {
    mockClerkAuth(mockAuth);
    mockGetKrewpactRoles.mockResolvedValue(['project_manager']);
    const { GET } = await import('@/app/api/system/webhooks/route');
    const res = await GET(makeRequest('/api/system/webhooks'));
    expect(res.status).toBe(403);
  });

  it('returns 200 for platform_admin', async () => {
    mockClerkAuth(mockAuth);
    mockGetKrewpactRoles.mockResolvedValue(['platform_admin']);
    mockFrom.mockReturnValue(paginatedChain([], 0));
    const { GET } = await import('@/app/api/system/webhooks/route');
    const res = await GET(makeRequest('/api/system/webhooks'));
    expect(res.status).toBe(200);
  });
});
