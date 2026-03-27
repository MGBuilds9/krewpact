import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockRequireRole = vi.fn();
vi.mock('@/lib/api/org', () => ({
  requireRole: (...args: unknown[]) => mockRequireRole(...args),
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

import { NextResponse } from 'next/server';

import { makeRequest } from '@/__tests__/helpers';

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
    mockRequireRole.mockResolvedValue(NextResponse.json({ error: 'Forbidden' }, { status: 403 }));
    const { GET } = await import('@/app/api/system/webhooks/route');
    const res = await GET(makeRequest('/api/system/webhooks'));
    expect(res.status).toBe(403);
    expect(mockRequireRole).toHaveBeenCalledWith(['platform_admin']);
  });

  it('returns 200 for platform_admin', async () => {
    mockRequireRole.mockResolvedValue({ userId: 'admin-user', roles: ['platform_admin'] });
    mockFrom.mockReturnValue(paginatedChain([], 0));
    const { GET } = await import('@/app/api/system/webhooks/route');
    const res = await GET(makeRequest('/api/system/webhooks'));
    expect(res.status).toBe(200);
  });
});
